import { saveImport } from "../services/renewalStorage";
import React, { useEffect, useState } from "react";
import { Contact } from "../types";
import { loadFromCloud, saveToCloud } from "../services/supabaseService";
import {
  RenewalData,
  ManagedPolicy,
  emptyData,
  parseWorkbook,
  mergePolicies,
  migrate,
  candidates,
  inactive,
  dueItems,
  today,
  key,
} from "../services/renewal";
const btn =
  "px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 text-sm";
export default function RenewalWorkspace({
  contacts,
  onContacts,
  customerId,
}: {
  contacts: Contact[];
  onContacts: (c: Contact[]) => void;
  customerId?: string;
}) {
  const [mailReady, setMailReady] = useState(false);
  useEffect(() => {
    fetch("/api/renewal-email")
      .then((r) => r.json())
      .then((x) => setMailReady(x.configured === true))
      .catch(() => {});
  }, []);
  const [data, setData] = useState<RenewalData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(""),
    [rows, setRows] = useState<ManagedPolicy[]>([]),
    [files, setFiles] = useState<string[]>([]),
    [selected, setSelected] = useState<ManagedPolicy | null>(null),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [settings, setSettings] = useState(emptyData.settings),
    [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    loadFromCloud("renewal_v1")
      .then((d) => setData(d || { ...emptyData, policies: migrate(contacts) }))
      .catch((e) => setError(String(e)));
  }, []);
  async function persist(next: RenewalData) {
    setBusy(true);
    setError("");
    try {
      if (!(await saveToCloud("renewal_v1", next)))
        throw new Error("云端保存失败，请重试；当前改动尚未保存");
      setData(next);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function upload(list: FileList | null) {
    if (!list) return;
    setBusy(true);
    setError("");
    try {
      const input = await Promise.all(
        Array.from(list).map(async (f) =>
          parseWorkbook(await f.arrayBuffer(), f.name),
        ),
      );
      setRows(input.flat());
      setFiles(Array.from(list).map((f) => f.name));
      setLinks({});
      setModal("import");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const identity = (p: ManagedPolicy, role: "applicant" | "insured") =>
    role === "applicant"
      ? `${p.applicant}|${p.phone || ""}|${p.document || ""}`
      : `insured:${p.insured}`;
  function resolve(
    p: ManagedPolicy,
    role: "applicant" | "insured",
    cs: Contact[],
  ) {
    const name = p[role];
    if (role === "insured" && name === p.applicant)
      return resolve(p, "applicant", cs);
    const choice = links[identity(p, role)];
    if (choice) return choice;
    const found = candidates(
      name,
      role === "applicant" ? p.phone : undefined,
      role === "applicant" ? p.document : undefined,
      cs,
    );
    const strong = found.filter((x) => x.strong);
    if (strong.length === 1) return strong[0].contact.id;
    if (!found.length) return "new";
    return "";
  }
  const pending = rows
    .filter((p) => !inactive(p.status))
    .flatMap((p) =>
      (["applicant", "insured"] as const)
        .filter((role) => p[role] && !resolve(p, role, contacts))
        .map((role) => ({ p, role, id: identity(p, role) })),
    )
    .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  async function commit() {
    if (!data || pending.length) return;
    const cs = structuredClone(contacts);
    const created = new Map<string, string>();
    const incoming = rows.map((p) => {
      const next = { ...p };
      if (inactive(p.status)) return next;
      for (const role of ["applicant", "insured"] as const) {
        if (!p[role]) continue;
        const identityKey =
          role === "insured" && p.insured === p.applicant
            ? identity(p, "applicant")
            : identity(p, role);
        let id = created.get(identityKey) || resolve(p, role, contacts);
        if (id === "new") {
          id = created.get(identityKey) || crypto.randomUUID();
          if (!created.has(identityKey)) {
            cs.push({
              id,
              remarkName: p[role],
              nickname: p[role],
              wxid: "",
              remarkInfo: "明亚保单导入",
              tags: [],
              addedAt: Date.now(),
              dealProducts: [],
              intentProducts: [],
              policies: [],
              ...(role === "applicant"
                ? { phoneNumber: p.phone, idCard: p.document }
                : {}),
            });
            created.set(identityKey, id);
          }
        }
        next[role === "applicant" ? "applicantId" : "insuredId"] = id;
      }
      return next;
    });
    const policies = mergePolicies(data.policies, incoming);
    const next = {
      ...data,
      policies,
      imports: [
        { at: new Date().toISOString(), files, count: rows.length },
        ...data.imports,
      ],
    };
    for (const c of cs) {
      const associated = policies.filter((p) => p.applicantId === c.id);
      const importedKeys = new Set(associated.map(key));
      c.policies = [
        ...(c.policies || []).filter((p) => !importedKeys.has(key(p))),
        ...associated,
      ];
      c.dealProducts = Array.from(
        new Set(
          (c.policies || [])
            .filter((p) => !inactive(p.status))
            .map((p) => p.productName),
        ),
      );
    }
    setBusy(true);
    try {
      await saveImport(next, cs);
      setData(next);
      onContacts(cs);
      setModal("done");
    } catch (e) {
      setError("导入未保存：" + String(e));
    } finally {
      setBusy(false);
    }
  }
  async function mark(p: ManagedPolicy, kind: string, dt?: string) {
    if (!data) return;
    const next = {
      ...data,
      policies: data.policies.map((x) =>
        x.id !== p.id
          ? x
          : {
              ...x,
              ...(kind === "renewal" ? { renewed: !x.renewed } : {}),
              payments: x.payments.map((q) =>
                q.date !== dt
                  ? q
                  : kind === "contact"
                    ? { ...q, contactedAt: new Date().toISOString() }
                    : {
                        ...q,
                        status: q.status === "已缴费" ? "未缴费" : "已缴费",
                        history: [
                          ...(q.history || []),
                          {
                            at: new Date().toISOString(),
                            from: q.status,
                            to: q.status === "已缴费" ? "未缴费" : "已缴费",
                            source: "人工标记",
                          },
                        ],
                      },
              ),
            },
      ),
    };
    if (await persist(next)) {
      setSelected(next.policies.find((x) => x.id === p.id) || null);
    }
  }
  if (!data)
    return <div className="p-6">{error || "正在读取保单与续费数据…"}</div>;
  const all = customerId
    ? data.policies.filter(
        (p) => p.applicantId === customerId || p.insuredId === customerId,
      )
    : data.policies;
  const tasks = dueItems(all).filter(
    (x) =>
      (filter === "all" || filter === x.type) &&
      `${x.policy.applicant}${x.policy.insured}${x.policy.productName}${x.policy.policyNumber}`.includes(
        search,
      ),
  );
  const open = (p: ManagedPolicy) => {
    setSelected(p);
    setModal("detail");
  };
  return (
    <div className="h-full overflow-auto bg-white">
      <div className="p-6 border-b border-gray-100 flex justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold">
          {customerId ? "关联保单" : "续费待办"}
        </h2>
        <div className="flex gap-2">
          <label className={btn}>
            上传明亚表格
            <input
              disabled={busy}
              className="hidden"
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={(e) => upload(e.target.files)}
            />
          </label>
          <button
            className={btn}
            onClick={() => {
              setSettings(data.settings);
              setModal("settings");
            }}
          >
            提醒设置
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-50 text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {[
            ["all", "全部待办"],
            ["payment", "本期应缴"],
            ["renewal", "到期续保"],
            ["policies", "全部保单"],
            ["history", "导入记录"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={btn + " " + (filter === v ? "bg-gray-100" : "")}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          提前30天提醒 · 每份保单仅展示最新一期未缴费记录 · 已逾期事项持续显示
        </p>
        <input
          className="border rounded p-2 w-full"
          placeholder="搜索投保人、被保人、产品或保单号"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {filter === "history" ? (
          data.imports.map((h, i) => (
            <div key={i} className="border rounded p-4">
              <p>
                {new Date(h.at).toLocaleString()} · {h.count} 条原始记录
              </p>
              <small>{h.files.join("、")}</small>
            </div>
          ))
        ) : filter === "policies" || customerId ? (
          <div className="space-y-2">
            {all
              .filter((p) =>
                `${p.applicant}${p.insured}${p.productName}${p.policyNumber}`.includes(
                  search,
                ),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => open(p)}
                  className="w-full text-left p-4 border rounded"
                >
                  <b>{p.productName}</b>　{p.status}
                  <p className="text-sm text-gray-500">
                    {p.policyNumber} · 投保人 {p.applicant} / 被保人 {p.insured}
                  </p>
                  {!p.expiryDate && !inactive(p.status) && (
                    <small>未设置到期日 · 点击补充续保日期</small>
                  )}
                </button>
              ))}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["客户 / 保单", "类型", "日期 / 金额", "操作"].map((x) => (
                    <th key={x} className="text-left p-3 border-b">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.policy.id + t.type} className="border-b">
                    <td className="p-3">
                      <button
                        onClick={() => open(t.policy)}
                        className="text-left"
                      >
                        <b>
                          {t.policy.applicant} / {t.policy.insured}
                        </b>
                        <p>{t.policy.productName}</p>
                        <small>{t.policy.policyNumber}</small>
                      </button>
                    </td>
                    <td>{t.type === "payment" ? "本期应缴" : "到期续保"}</td>
                    <td className={t.date < today() ? "text-red-600" : ""}>
                      {t.date}
                      <p>{t.amount && `¥ ${t.amount}`}</p>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {t.type === "payment" && (
                          <button
                            disabled={busy}
                            className={btn}
                            onClick={() => mark(t.policy, "contact", t.date)}
                          >
                            {t.policy.payments.find((q) => q.date === t.date)
                              ?.contactedAt
                              ? "已联系"
                              : "标记已联系"}
                          </button>
                        )}
                        <button
                          disabled={busy}
                          className={btn}
                          onClick={() => {
                            setSelected(t.policy);
                            setModal(
                              t.type === "payment"
                                ? "paid:" + t.date
                                : "renewed",
                            );
                          }}
                        >
                          确认{t.type === "payment" ? "已缴费" : "已续保"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tasks.length && (
              <p className="p-10 text-center text-gray-400">
                暂无符合条件的待办。可在“全部保单”补充到期日期，或上传应缴明细。
              </p>
            )}
          </div>
        )}
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-end">
              <button className={btn} onClick={() => setModal("")}>
                关闭
              </button>
            </div>
            {modal === "import" && (
              <>
                <h3 className="font-bold text-lg">导入预览</h3>
                <p className="my-3">
                  原始记录 {rows.length} · 合并后保单{" "}
                  {mergePolicies([], rows).length} · 撤单/退保等记录{" "}
                  {rows.filter((p) => inactive(p.status)).length} · 待核对{" "}
                  {pending.length}
                </p>
                <p className="text-sm text-gray-500">
                  重复保单更新；撤单等状态保留历史并退出提醒。最新导入的同一期缴费状态覆盖人工标记。未出现在表格中的保单不会删除。
                </p>
                {pending.map(({ p, role, id }) => (
                  <div key={id} className="my-3 p-3 border rounded">
                    <b>{p[role]}</b>（
                    {role === "applicant" ? "投保人" : "被保人"}）
                    <p>
                      <small>
                        {role === "applicant"
                          ? `手机 ${p.phone || "缺失"} / 证件 ${p.document || "缺失"}`
                          : "表格未提供被保人的手机号、证件号，请确认关联"}
                      </small>
                    </p>
                    <select
                      className="border p-2"
                      value={links[id] || ""}
                      onChange={(e) =>
                        setLinks({ ...links, [id]: e.target.value })
                      }
                    >
                      <option value="">请选择关联</option>
                      {candidates(p[role], undefined, undefined, contacts).map(
                        (c) => (
                          <option key={c.contact.id} value={c.contact.id}>
                            {c.contact.remarkName} ·{" "}
                            {c.contact.phoneNumber || "无手机号"}
                          </option>
                        ),
                      )}
                      <option value="new">确认为不同客户，新增资料</option>
                    </select>
                  </div>
                ))}
                <button
                  disabled={busy || pending.length > 0}
                  className={btn + " mt-4 disabled:opacity-40"}
                  onClick={commit}
                >
                  {busy ? "正在保存…" : "确认导入"}
                </button>
              </>
            )}
            {modal === "done" && (
              <div className="p-8">导入已保存，客户关联及应缴记录已更新。</div>
            )}
            {modal === "settings" && (
              <>
                <h3 className="text-lg font-bold">提醒设置</h3>
                <p className="text-sm text-gray-500 my-3">
                  发送服务接通后，每日汇总未来30天及逾期待办；同一保单只列最新待缴期次。
                </p>
                <label className="block my-3">
                  收件邮箱
                  <input
                    type="email"
                    className="border rounded p-2 ml-3"
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                  />
                </label>
                <label className="block my-3">
                  北京时间
                  <input
                    type="time"
                    className="border rounded p-2 ml-3"
                    value={settings.time}
                    onChange={(e) =>
                      setSettings({ ...settings, time: e.target.value })
                    }
                  />
                </label>
                <label className="block my-3">
                  <input
                    type="checkbox"
                    disabled={!mailReady}
                    checked={settings.enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, enabled: e.target.checked })
                    }
                  />{" "}
                  启用每日摘要
                </label>
                {!mailReady && (
                  <p className="text-amber-700">
                    QQ邮箱发信服务尚未配置完成，当前不会发送邮件。
                  </p>
                )}
                <button
                  disabled={busy || !/^\S+@\S+\.\S+$/.test(settings.email)}
                  className={btn}
                  onClick={async () => {
                    if (
                      await persist({
                        ...data,
                        settings: {
                          ...settings,
                          enabled: mailReady && settings.enabled,
                        },
                      })
                    )
                      setModal("");
                  }}
                >
                  保存设置
                </button>
                <button
                  className={btn + " ml-2"}
                  onClick={() => setModal("email")}
                >
                  邮件内容预览
                </button>
              </>
            )}
            {modal === "email" && (
              <>
                <h3 className="font-bold">每日续费摘要 · {today()}</h3>
                <p>收件人 {data.settings.email}</p>
                {dueItems(data.policies).map((t) => (
                  <div className="border-b p-3" key={t.policy.id + t.type}>
                    {t.policy.applicant} / {t.policy.insured} ·{" "}
                    {t.policy.productName}
                    <p>
                      {t.type === "payment" ? "应缴" : "续保"} {t.date}{" "}
                      {t.amount && `¥${t.amount}`}
                    </p>
                  </div>
                ))}
                {!dueItems(data.policies).length && <p>暂无待办</p>}
              </>
            )}
            {modal === "detail" && selected && (
              <>
                <h3 className="font-bold text-lg">{selected.productName}</h3>
                <p>
                  {selected.policyNumber} · {selected.status}
                </p>
                <p className="my-3">
                  投保人 {selected.applicant}　被保人 {selected.insured}
                </p>
                <label>
                  到期日期（按保单确认）
                  <input
                    className="border rounded p-2"
                    type="date"
                    value={selected.expiryDate || ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        expiryDate: e.target.value,
                        renewed: false,
                      })
                    }
                  />
                </label>
                <button
                  disabled={busy}
                  className={btn + " ml-2"}
                  onClick={() =>
                    persist({
                      ...data,
                      policies: data.policies.map((p) =>
                        p.id === selected.id ? selected : p,
                      ),
                    })
                  }
                >
                  保存到期日
                </button>
                <h4 className="font-bold mt-6">缴费历史</h4>
                {selected.payments.map((q) => (
                  <div className="p-3 border-b" key={q.date}>
                    {q.date} · ¥{q.amount} · {q.status}　
                    <button
                      disabled={busy}
                      className={btn}
                      onClick={() => mark(selected, "payment", q.date)}
                    >
                      {q.status === "已缴费" ? "改为未缴费" : "标记已缴费"}
                    </button>
                    {q.history?.length > 0 && (
                      <details>
                        <summary>状态变更记录</summary>
                        {q.history.map((h, i) => (
                          <p key={i}>
                            {h.at} · {h.source} · {h.from} → {h.to}
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                ))}
                {!selected.payments.length && (
                  <p className="my-4 text-gray-500">
                    尚无应缴明细，上传后自动关联。
                  </p>
                )}
                {selected.renewed && (
                  <button
                    className={btn}
                    onClick={() => mark(selected, "renewal")}
                  >
                    撤销已续保标记
                  </button>
                )}
              </>
            )}
            {(modal.startsWith("paid:") || modal === "renewed") && selected && (
              <>
                <h3 className="font-bold">
                  确认{modal === "renewed" ? "本次已续保" : "本期已缴费"}
                </h3>
                <p className="my-4">
                  {selected.productName} · {selected.policyNumber} ·{" "}
                  {modal.split(":")[1]}
                </p>
                <button
                  disabled={busy}
                  className={btn}
                  onClick={async () => {
                    await mark(
                      selected,
                      modal === "renewed" ? "renewal" : "payment",
                      modal.split(":")[1],
                    );
                    setModal("");
                  }}
                >
                  确认标记
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
