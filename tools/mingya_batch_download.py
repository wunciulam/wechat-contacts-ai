#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
明亚保险经纪工作台 —— 任务保单 PDF 批量下载工具

链路（从 workbench-web 前端 JS 逆向确认）：
  1) GET  https://wps.mingya.com.cn/workbench/user/tokenLogin?token=<auth_token>
       -> 服务端下发 HttpOnly Cookie: auth_token（Domain=.mingya.com.cn），后续接口凭此鉴权
  2) GET  .../workbench/task/list            分页拉取任务列表
  3) GET  .../workbench/task/taskDetail?id=  逐个任务取 fileInfo（附件数组）
  4) GET  .../workbench/file/view?fileId=&taskId=  换取该附件的真实下载 URL
  5) 直接 GET 该 URL 落盘

用法：
  python3 mingya_batch_download.py --token MY_xxxx
  python3 mingya_batch_download.py --token MY_xxxx --list      # 只列清单不下
  python3 mingya_batch_download.py --token MY_xxxx --pages 5

  # 若 auth_token 链接过期，可从浏览器 DevTools 复制 Cookie 直接跑：
  #   DevTools → Application → Cookies → wps.mingya.com.cn → auth_token
  python3 mingya_batch_download.py --cookie "auth_token=xxxx" --list
"""

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    sys.exit("缺少依赖：pip install requests")

API = "https://wps.mingya.com.cn/workbench"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

HDRS = {
    "User-Agent": UA,
    "Referer": "https://d.mingya.com.cn/",
    "Origin": "https://d.mingya.com.cn",
    "platform": "WEB",
    "Accept": "application/json, text/plain, */*",
}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


class Client:
    def __init__(self, token, proxy=None):
        self.s = requests.Session()
        self.s.headers.update(HDRS)
        if proxy:
            self.s.proxies = {"http": proxy, "https": proxy}

    def login(self, token):
        """auth_token -> 会话 Cookie"""
        r = self.s.get(f"{API}/user/tokenLogin", params={"token": token}, timeout=30)
        r.raise_for_status()
        j = r.json()
        if j.get("code") != 200:
            raise RuntimeError(f"登录失败：{j.get('msg') or j.get('message') or j}")
        cookies = {c.name: c.value for c in r.cookies}
        # 服务端也可能直接种在 session 里
        merged = dict(self.s.cookies)
        merged.update(cookies)
        self.s.cookies.update(merged)
        log(f"登录成功 · {j.get('data', {}).get('name', '?')}")
        return j.get("data", {})

    def _get(self, path, **params):
        r = self.s.get(f"{API}{path}", params=params, timeout=40)
        r.raise_for_status()
        try:
            j = r.json()
        except ValueError:
            raise RuntimeError(f"{path} 返回非 JSON：{r.text[:200]}")
        if j.get("code") not in (200, None):
            raise RuntimeError(f"{path} -> {j.get('msg') or j}")
        return j

    def tasks(self, page=1, size=100, first_type="1"):
        """分页拉任务列表。

        响应是 MyBatis-Plus Page：data.records / data.total / data.size / data.current
        实测 pageNum/pageSize 被服务端忽略，正确的是 current/size。
        """
        j = self._get("/task/list", firstType=first_type, current=page, size=size)
        d = j.get("data") or {}
        recs = d.get("records") if isinstance(d, dict) else None
        if recs is None:
            recs = d.get("list") if isinstance(d, dict) else d
        return recs or [], d.get("total"), d.get("size"), d.get("current")

    def tasks_by_user(self, first_type="1"):
        """一次性拿全量（/task/listUser 不受分页限制），返回扁平任务列表。"""
        j = self._get("/task/listUser", firstType=first_type)
        d = j.get("data") or {}
        groups = d.get("records") if isinstance(d, dict) else d
        out = []
        for g in (groups or []):
            out.extend(g.get("tasks") or [])
        return out

    def detail(self, task_id):
        j = self._get("/task/taskDetail", id=task_id)
        return j.get("data") or {}

    def file_url(self, file_id, task_id):
        j = self._get("/file/view", fileId=file_id, taskId=task_id)
        return j.get("data")

    def download(self, url, dest: Path):
        with self.s.get(url, stream=True, timeout=120, allow_redirects=True) as r:
            r.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp = dest.with_suffix(dest.suffix + ".part")
            n = 0
            with open(tmp, "wb") as f:
                for chunk in r.iter_content(1 << 16):
                    if chunk:
                        f.write(chunk)
                        n += len(chunk)
            tmp.rename(dest)
        return n


def safe_name(s, maxlen=80):
    s = re.sub(r'[\\/:*?"<>|\r\n\t]', "_", str(s or "")).strip(" .")
    return (s[:maxlen] or "untitled")


def guess_ext(item, url):
    t = (item.get("type") or "").lower()
    m = {
        "pdf": ".pdf", "jpg": ".jpg", "jpeg": ".jpg", "png": ".png",
        "xlsx": ".xlsx", "xls": ".xls", "doc": ".doc", "docx": ".docx",
    }
    if t in m:
        return m[t]
    if url:
        e = os.path.splitext(urlparse(url).path)[1]
        if re.fullmatch(r"\.[A-Za-z0-9]{2,5}", e or ""):
            return e.lower()
    return ""


def main():
    ap = argparse.ArgumentParser(description="明亚工作台 保单附件批量下载")
    ap.add_argument("--token", help="URL 里 auth_token= 的值")
    ap.add_argument("--cookie", help="直接提供 Cookie（如 auth_token=xxx），绕过 token 登录")
    ap.add_argument("--out", default="./明亚保单", help="输出目录")
    ap.add_argument("--pages", type=int, default=200, help="每分类最多翻几页（100条/页）")
    ap.add_argument("--size", type=int, default=100, help="每页条数")
    ap.add_argument("--types", default="", help="只要这些后缀，如 pdf,xlsx；空=全部")
    ap.add_argument("--first-types", default="1,2,3,4,5",
                    help="任务分类，逗号分隔。1待办 2待阅 3 4 5 6全部通知")
    ap.add_argument("--menu", default="",
                    help="按分类名/标题关键词过滤，如 保单,续期,投保；空=不过滤")
    ap.add_argument("--max-detail", type=int, default=2500, help="最多查多少个任务详情")
    ap.add_argument("--list", action="store_true", help="只出清单不下载")
    ap.add_argument("--proxy", default=os.environ.get("HTTPS_PROXY"), help="代理")
    ap.add_argument("--workers", type=int, default=4, help="并发数")
    a = ap.parse_args()
    if not a.token and not a.cookie:
        ap.error("必须提供 --token 或 --cookie 之一")

    cli = Client(a.token, a.proxy)

    if a.cookie:
        # 直接注入 Cookie，跳过 tokenLogin
        for part in a.cookie.split(";"):
            part = part.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                cli.s.cookies.set(k.strip(), v.strip(), domain=".mingya.com.cn")
        log("已注入 Cookie，跳过 token 登录")
        try:
            cli.tasks(page=1, size=1)   # 探活
        except Exception as e:
            log(f"✗ Cookie 无效：{e}")
            return 2
    else:
        try:
            cli.login(a.token)
        except Exception as e:
            log(f"✗ {e}")
            log("提示：auth_token 有时效，过期后需从新打开的工作台页面重新复制，")
            log("      或改用 --cookie 直接提供浏览器里的 auth_token Cookie。")
            return 2

    want = {x.strip().lower() for x in a.types.split(",") if x.strip()}

    # 1) 收集任务：先探测 current/size 分页是否生效，不生效则走 listUser 全量
    all_tasks, seen = [], set()
    types = [x.strip() for x in a.first_types.split(",") if x.strip()]

    first_recs, total, srv_size, srv_cur = cli.tasks(page=1, size=100, first_type=types[0])
    paging_ok = (srv_size == 100)
    log(f"分页参数{'生效' if paging_ok else '不生效'}（服务端 size={srv_size}, current={srv_cur}）")

    for ft in types:
        if paging_ok:
            pg = 1
            while pg <= a.pages:
                try:
                    recs, tot, _, _ = cli.tasks(page=pg, size=100, first_type=ft)
                except Exception as e:
                    log(f"  类型{ft} 第{pg}页失败：{e}")
                    break
                if not recs:
                    break
                new = 0
                for t in recs:
                    tid = str(t.get("id"))
                    if tid not in seen:
                        seen.add(tid)
                        all_tasks.append(t)
                        new += 1
                log(f"  类型{ft} 第{pg}页 → 新增 {new}（该分类共 {tot}，累计 {len(all_tasks)}）")
                if len(recs) < 100:
                    break
                pg += 1
        else:
            try:
                ts = cli.tasks_by_user(first_type=ft)
            except Exception as e:
                log(f"  类型{ft} listUser 失败：{e}")
                continue
            new = 0
            for t in ts:
                tid = str(t.get("id"))
                if tid not in seen:
                    seen.add(tid)
                    all_tasks.append(t)
                    new += 1
            log(f"  类型{ft} listUser → 新增 {new}（该分类共 {len(ts)}，累计 {len(all_tasks)}）")

    if not all_tasks:
        log("没有取到任务。")
        return 1

    # 按 menuName 过滤
    kws = [x.strip() for x in a.menu.split(",") if x.strip()]
    if kws:
        before = len(all_tasks)
        all_tasks = [t for t in all_tasks
                     if any(k in (t.get("menuName") or "") or k in (t.get("title") or "")
                            for k in kws)]
        log(f"分类过滤 {'/'.join(kws)}：{before} → {len(all_tasks)} 个任务")

    if a.max_detail and len(all_tasks) > a.max_detail:
        log(f"超过 --max-detail {a.max_detail}，截断处理")
        all_tasks = all_tasks[:a.max_detail]

    # 2) 逐个取附件
    items = []
    for idx, t in enumerate(all_tasks, 1):
        tid = t.get("id")
        title = t.get("title") or f"task-{tid}"
        try:
            d = cli.detail(tid)
        except Exception as e:
            log(f"  [{idx}/{len(all_tasks)}] 详情失败 {tid}：{e}")
            continue
        for f in (d.get("fileInfo") or []):
            u = f.get("url")
            if not u:
                try:
                    u = cli.file_url(f.get("id"), tid)
                except Exception:
                    u = None
            if not u:
                continue
            ext = guess_ext(f, u)
            if want and ext.lstrip(".").lower() not in want:
                continue
            items.append({
                "taskId": tid, "taskTitle": title,
                "fileId": f.get("id"), "name": f.get("name") or "unnamed",
                "url": u, "ext": ext,
                "creator": f.get("creatorName"), "time": f.get("createTime"),
            })
        if idx % 10 == 0 or idx == len(all_tasks):
            log(f"  详情进度 {idx}/{len(all_tasks)}，已发现附件 {len(items)}")

    if not items:
        log("这些任务下没有可下载的附件。")
        return 1

    # 3) 清单落盘
    out = Path(a.out).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    mf = out / "_清单.json"
    mf.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"共发现 {len(items)} 个附件，清单 -> {mf}")

    if a.list:
        for it in items:
            print(f"  {it['taskTitle'][:28]:<30} | {it['name']}{it['ext']}")
        return 0

    # 4) 并发下载
    ok = fail = 0
    lock_done = []

    def job(it):
        nonlocal ok, fail
        folder = out / safe_name(it["taskTitle"], 60)
        dest = folder / (safe_name(it["name"]) + it["ext"])
        if dest.exists() and dest.stat().st_size > 0:
            return "skip"
        try:
            n = cli.download(it["url"], dest)
            return f"ok {n}"
        except Exception as e:
            return f"fail {e}"

    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        for i, res in enumerate(ex.map(job, items), 1):
            lock_done.append(res)
            if res.startswith("ok"):
                ok += 1
            elif res.startswith("fail"):
                fail += 1
                print(f"  ✗ {res}")
            if i % 10 == 0 or i == len(items):
                log(f"下载进度 {i}/{len(items)} · 成功 {ok} · 跳过 {len(lock_done)-ok-fail} · 失败 {fail}")

    log(f"完成。目录：{out}")
    log(f"成功 {ok} / 跳过 {len(lock_done)-ok-fail} / 失败 {fail}")
    return 0


if __name__ == "__main__":
    sys.exit(main())