import WorkspaceDialog from './WorkspaceDialog';
import PolicyPaymentSummary, { PaymentDate, formatMoney } from './PolicyPaymentSummary';
import { ArrowLeft, Settings } from 'lucide-react';
import PolicyDashboard from "./PolicyDashboard";
import { PageHeader } from "./PageHeader";
import PolicyDetail from "./PolicyDetail";
import { saveImport, savePolicyMark, deleteSelectedPolicies } from "../services/renewalStorage";
import React, { useEffect, useState } from "react";
import { Contact } from "../types";
import { getRenewalSnapshot, hasFreshRenewalSnapshot, loadRenewalSnapshot, rememberRenewalSnapshot, subscribeRenewalSnapshot } from "../services/renewalCache";
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
  nextPayment,
  remainingInstallments,
  projectContacts,
} from "../services/renewal";
const btn = "btn btn-secondary text-sm";
export default function RenewalWorkspace({
  contacts,
  importFiles,
  onImportConsumed,
  onContacts,
  beforeSave,
  customerId,
  initialPolicyId,
  onCloseDetail,
  ...dashboardProps
}: {
  contacts: Contact[];
  importFiles?: FileList | null;
  onImportConsumed?: () => void;
  onContacts: (c: Contact[]) => void;
  beforeSave?: () => Promise<unknown>;
  customerId?: string;
  initialPolicyId?: string;
  onCloseDetail?: () => void;
  filterTags?: Set<string>;
  followUpFilter?: any;
  onEditContact?: (c: Contact) => void;
  onAddPolicy?: () => void;
  onBatchDeleteContacts?: (ids: string[]) => void;
  onDeletePolicy?: (contactId: string, policyId: string) => void;
}) {
  const markPending = React.useRef(false);
  const ownSnapshot = React.useRef<RenewalData>();
  const skipContactsMerge = React.useRef<Contact[]>();
  const [detailDirty, setDetailDirty] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(Boolean(customerId));
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [mailReady, setMailReady] = useState(false);
  useEffect(() => {
    fetch("/api/renewal-email")
      .then((r) => r.json())
      .then((x) => setMailReady(x.configured === true))
      .catch(() => {});
  }, []);
  const contactsRef = React.useRef(contacts);
  contactsRef.current = contacts;
  const [syncing, setSyncing] = useState(!hasFreshRenewalSnapshot());
  const [syncError, setSyncError] = useState("");
  const [cloudReady, setCloudReady] = useState(hasFreshRenewalSnapshot());
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<RenewalData>(() => {
    const cached = getRenewalSnapshot();
    return { ...(cached || emptyData), policies: mergePolicies(cached?.policies || [], migrate(contacts)) };
  }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(""),
    [rows, setRows] = useState<ManagedPolicy[]>([]),
    [preview, setPreview] = useState(false),
    [files, setFiles] = useState<string[]>([]),
    [selected, setSelected] = useState<ManagedPolicy | null>(null),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [settings, setSettings] = useState(emptyData.settings),
    [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    const apply = (loaded: RenewalData) => {
      if (!active) return;
      setData(loaded === ownSnapshot.current ? loaded : { ...loaded, policies: mergePolicies(loaded.policies, migrate(contactsRef.current)) });
      setCloudReady(true);
      setSyncError("");
    };
    const unsubscribe = subscribeRenewalSnapshot(apply);
    const fresh = retry === 0 && hasFreshRenewalSnapshot();
    setSyncing(!fresh);
    setCloudReady(fresh);
    loadRenewalSnapshot(retry > 0).then(apply).catch(() => {
      if (active) {
        setCloudReady(false);
        setSyncError("续期数据同步失败，当前显示已读取的保单。");
      }
    }).finally(() => { if (active) setSyncing(false); });
    return () => { active = false; unsubscribe(); };
  }, [retry]);
  useEffect(() => {
    if (skipContactsMerge.current === contacts) { skipContactsMerge.current = undefined; return; }
    setData(current => current ? { ...current, policies: mergePolicies(current.policies, migrate(contacts)) } : current);
  }, [contacts]);
  useEffect(() => {
    if (data && initialPolicyId && !detailDirty) {
      const p = data.policies.find((x) => x.id === initialPolicyId);
      if (p) {
        setSelected(p);
        setModal("detail");
      }
    }
  }, [data, initialPolicyId, detailDirty]);
  async function persist(next: RenewalData, baseContacts = contacts) {
    if (!cloudReady) {
      setError("请先完成续期数据同步，再保存修改。");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const projected = projectContacts(baseContacts, next.policies);
      await beforeSave?.();
      const savedContacts=await saveImport(next, projected);
      ownSnapshot.current = next;
      skipContactsMerge.current = savedContacts;
      rememberRenewalSnapshot(next);
      onContacts(savedContacts);
      setData(next);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!importFiles) return;
    void upload(importFiles);
    onImportConsumed?.();
  }, [importFiles]);

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
      setPreview(true);
      setFiles(Array.from(list).map((f) => f.name));
      setLinks({});
      setModal("import");
      setFilter("policies");
      setRemindersOpen(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const identity = (p: ManagedPolicy, role: "applicant" | "insured") =>
    role === "applicant"
      ? `${p.applicant}|${p.phone ? "phone:" + p.phone.slice(-4) : p.document ? "id:" + p.document.slice(-4) : "unknown"}`
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
    if (choice?.startsWith("batch:")) {
      const target = rows[Number(choice.slice(6))];
      const targetId = resolve(target, "applicant", cs);
      return targetId === "new"
        ? "new:" + identity(target, "applicant")
        : targetId;
    }
    if (choice) return choice;
    const known = data?.policies.find((x) => key(x) === key(p));
    const knownId =
      role === "applicant" ? known?.applicantId : known?.insuredId;
    if (knownId && known?.[role] === name && cs.some((c) => c.id === knownId))
      return knownId;
    const found = candidates(
      name,
      role === "applicant" ? p.phone : undefined,
      role === "applicant" ? p.document : undefined,
      cs,
    );
    const strong = found.filter((x) => x.strong);
    if (strong.length === 1) return strong[0].contact.id;
    if (!found.length) {
      if (
        role === "insured" &&
        rows.some((x) => x.applicant === name && !inactive(x.status))
      )
        return "";
      return "new";
    }
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
        let identityKey =
          role === "insured" && p.insured === p.applicant
            ? identity(p, "applicant")
            : identity(p, role);
        let id = created.get(identityKey) || resolve(p, role, contacts);
        if (id.startsWith("new:")) {
          identityKey = id.slice(4);
          id = created.get(identityKey) || "new";
        }
        if (id === "new") {
          id = created.get(identityKey) || crypto.randomUUID();
          if (!created.has(identityKey)) {
            cs.push({
              id,
              remarkName: p[role],
              nickname: p[role],
              wxid: "",
              remarkInfo: "保单表格导入",
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
      if (!cloudReady) throw new Error("请先完成续期数据同步，再确认导入。");
      const savedContacts=await saveImport(next, cs);
      rememberRenewalSnapshot(next);
      setData(next);
      onContacts(savedContacts);
      setModal("done");
    } catch (e) {
      setError("导入未保存：" + String(e));
    } finally {
      setBusy(false);
    }
  }
  async function mark(p: ManagedPolicy, kind: string, dt?: string) {
    if (!data) return;
    if (markPending.current || busy || !cloudReady) return false;
    markPending.current = true;
    setBusy(true);
    setError("");
    try {
      await beforeSave?.();
      const result = await savePolicyMark(p, kind, dt);
      const update = (policy: ManagedPolicy): ManagedPolicy => policy.id === p.id
        ? { ...policy, payments: result.payments, ...(kind === 'renewal' ? { renewed: result.renewed } : {}) }
        : policy;
      const next = { ...data, policies: data.policies.map(update) };
      const projected = contactsRef.current.map(c => c.policies?.some(policy => policy.id === p.id)
        ? { ...c, policies: c.policies.map(policy => update(policy as ManagedPolicy)) } : c);
      ownSnapshot.current = next;
      skipContactsMerge.current = projected;
      rememberRenewalSnapshot(next);
      onContacts(projected);
      setData(next);
      setSelected(next.policies.find(x => x.id === p.id) || null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { markPending.current = false; setBusy(false); }
  }
  async function deletePolicies(contactId:string,policyIds:string[],requestId:string) {
    if(!cloudReady||busy)throw new Error('请等待数据同步完成后重试。');
    setBusy(true);
    try {
      await beforeSave?.();
      const removed=new Set(await deleteSelectedPolicies(contactId,policyIds,requestId));
      const next={...data,policies:data.policies.filter(p=>!removed.has(p.id))};
      const projected=contactsRef.current.map(c=>({...c,policies:c.policies?.filter(p=>!removed.has(p.id))}));
      ownSnapshot.current=next;skipContactsMerge.current=projected;
      rememberRenewalSnapshot(next);onContacts(projected);setData(next);
    } finally {setBusy(false);}
  }
  const syncStatus = syncing || syncError ? (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 text-sm text-gray-600" role="status">
      <span>{syncing ? "正在同步续期数据…" : syncError}</span>
      {syncError && <button className="btn btn-secondary btn-sm" disabled={syncing} onClick={() => setRetry(n => n + 1)}>重新同步</button>}
    </div>
  ) : null;
  if (onCloseDetail) {
    const policy = selected || data?.policies.find(p => p.id === initialPolicyId);
    return <WorkspaceDialog title="保单详情" onClose={() => {
      if (busy) return;
      if (detailDirty && !window.confirm('资料尚未保存，确认放弃修改？')) return;
      onCloseDetail();
    }}>
          {syncStatus}
          {error && <p role="alert" className="text-red-600 mb-3">{error}</p>}
          {!data ? <p>正在读取保单…</p> : !policy ? <p>未找到这份保单，请关闭后重新打开。</p> : <PolicyDetail onDirtyChange={setDetailDirty} policy={policy} contacts={contacts} busy={busy} onMark={date => mark(policy, "payment", date)} onSave={async p => {
            if (data.policies.some(x => x.id !== p.id && key(x) === key(p))) { setError("该保单号已存在，请核对。"); return false; }
            const next = {...data, policies: data.policies.map(x => x.id === p.id ? p : x)};
            if (await persist(next)) {setSelected(p); return true;} return false;
          }} />}
    </WorkspaceDialog>;
  }
  if (!data)
    return <div className="p-6">{error || "正在读取保单与续费数据…"}</div>;
  const shownPolicies = preview && rows.length ? mergePolicies(data.policies, rows) : data.policies;
  const all = customerId
    ? shownPolicies.filter(
        (p) => p.applicantId === customerId || p.insuredId === customerId,
      )
    : shownPolicies;
  const tasks = dueItems(all).filter(x => x.type === "payment").filter(
    (x) =>
      (filter === "all" || filter === x.type) &&
      `${x.policy.applicant}${x.policy.insured}${x.policy.productName}${x.policy.policyNumber}`.includes(
        search,
      ),
  );
  const currentDay = today();
  const daysLeft = (date: string) => Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(currentDay + "T00:00:00Z")) / 86400000);
  const daysLabel = (date: string) => { const n = daysLeft(date); return n < 0 ? `逾期 ${-n} 天` : n === 0 ? "今天缴费" : `剩余 ${n} 天`; };
  const remainingLabel = (p: ManagedPolicy) => { const n = remainingInstallments(p); return n === undefined ? "待补充" : `${n} 期`; };
  const open = (p: ManagedPolicy) => {
    setSelected(p);
    setModal("detail");
  };
  return (
    <div className="h-full overflow-auto bg-white text-sm">
      <input
        ref={fileRef}
        className="hidden"
        type="file"
        multiple
        accept=".xlsx,.xls"
        onChange={(e) => upload(e.target.files)}
      />
      {syncStatus}
      {busy && !modal && <p role="status" className="px-6 py-2 text-gray-600">正在保存…</p>}
      {error && !modal && !remindersOpen && <p role="alert" className="p-4 text-red-600">{error}</p>}
      {!remindersOpen && !customerId ? (
        <PolicyDashboard
          {...dashboardProps}
          contacts={projectContacts(contacts, data.policies, true)}
          filterTags={dashboardProps.filterTags || new Set()}
          followUpFilter={dashboardProps.followUpFilter || null}
          onEditContact={dashboardProps.onEditContact || (() => {})}
          onAddPolicy={dashboardProps.onAddPolicy || (() => {})}
          reminderCount={
            new Set(dueItems(data.policies).map((t) => t.policy.id)).size
          }
          onReminders={() => {
            setFilter("all");
            setRemindersOpen(true);
          }}
          onImport={() => fileRef.current?.click()}
          onDeletePolicies={deletePolicies}
          onDeletePolicy={async (_contactId, policyId) => {
            if (!confirm("确定删除这份保单及其缴费记录吗？所有关联客户中的这份保单将同步移除。")) return;
            await persist({ ...data, policies: data.policies.filter(p => p.id !== policyId) },
              contacts.map(c => ({ ...c, policies: c.policies?.filter(p => p.id !== policyId) })));
          }}
          onBatchDeleteContacts={async (ids) => {
            const removed = new Set(ids);
            await persist({ ...data, policies: data.policies.filter(p => !removed.has(p.applicantId || "")).map(p => removed.has(p.insuredId || "") ? { ...p, insuredId: undefined } : p) }, contacts.filter(c => !removed.has(c.id)));
          }}
          onPolicyDetail={(p) =>
            open(
              data.policies.find((x) => key(x) === key(p)) || {
                ...p,
                applicantId: contacts.find((c) =>
                  c.policies?.some((x) => x.id === p.id),
                )?.id,
                payments: [],
              },
            )
          }
        />
      ) : (
        <>
          <div className="border-b border-gray-100">
            <PageHeader
              title={customerId ? "关联保单" : "续期提醒"}
              actionButton={
                <div className="flex gap-2 flex-wrap">
                  {!customerId && (
                    <button
                      className={btn}
                      onClick={() => setRemindersOpen(false)}
                    >
                      <ArrowLeft size={16}/>返回保单管理
                    </button>
                  )}
                  <button
                    className={btn}
                    onClick={() => {
                      setSettings(data.settings);
                      setModal("settings");
                    }}
                  >
                    <Settings size={16}/>通知设置
                  </button>
                </div>
              }
            />
          </div>
          <div className="p-6 space-y-4">
            {error && !modal && (
              <div role="alert" className="p-3 bg-red-50 text-red-700">
                {error}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {[
                ["all", "30天内待缴"],
                ["policies", "全部保单"],
                ["history", "导入记录"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  aria-pressed={filter === v}
                  className={btn + " renewal-filter"}
                  onClick={() => setFilter(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="搜索投保人、被保人、产品或保单号"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {preview && rows.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <span>本地表格预览：已读取 {rows.length} 条，尚未保存到线上。可在“全部保单”核对缴费字段。</span>
                <button className={btn} onClick={() => { setPreview(false); setRows([]); }}>退出预览</button>
              </div>
            )}
            {filter === "history" ? (
              data.imports.map((h, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-4">
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
                      className="w-full rounded-lg border border-gray-200 p-4 text-left text-sm hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-28"><span className="block text-xs text-gray-400">投保人</span><strong>{p.applicant || "待补充"}</strong></div>
                        <div className="min-w-28"><span className="block text-xs text-gray-400">被保人</span><strong>{p.insured || "待补充"}</strong></div>
                        <div className="flex-1 min-w-56"><span className="block text-xs text-gray-400">保单</span><strong>{p.productName}</strong><span className="ml-2 text-xs text-gray-500">{p.policyNumber}</span></div>
                        <div className="min-w-36"><span className="block text-xs text-gray-400">下次缴费</span><PolicyPaymentSummary policy={p} amount={false}/></div><div className="flex flex-nowrap items-start gap-6 shrink-0"><div><span className="block text-xs text-gray-400">{nextPayment(p)?.amountReference?'下期参考金额':'本期应缴'}</span>{formatMoney(nextPayment(p)?.amount, p.mingya?.currency)}</div><div><span className="block text-xs text-gray-400">剩余期数</span>{remainingLabel(p)}</div></div>
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <>
              <div className="space-y-3 sm:hidden">
                {tasks.map(t => <article key={t.policy.id + t.type} className="rounded-lg border border-gray-200 p-4">
                  <button className="mb-3 text-left" onClick={() => open(t.policy)}>
                    <div className="text-sm font-semibold">{t.policy.applicant || '投保人待补充'}</div>
                    <div className="mt-1 text-sm">{t.policy.productName}</div>
                    <div className="mt-1 text-xs text-gray-500">{t.policy.policyNumber}</div>
                  </button>
                  <PaymentDate date={t.date} estimated={t.estimated}/>
                  <dl className="my-3 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-gray-500">{t.type==='payment'&&nextPayment(t.policy)?.amountReference?'下期参考金额':'本期应缴'}</dt><dd className="mt-1 tabular-nums">{formatMoney(t.amount, t.policy.mingya?.currency)}</dd></div>
                    <div><dt className="text-xs text-gray-500">剩余期数</dt><dd className="mt-1">{remainingLabel(t.policy)}</dd></div>
                  </dl>
                  <div className="flex flex-wrap justify-end gap-2">
                    {t.type === 'payment' && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => mark(t.policy,'contact',t.date)}>{t.policy.payments.find(p => p.date === t.date)?.contactedAt ? '已联系' : '标记已联系'}</button>}
                    <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => {setSelected(t.policy);setModal(t.type === 'payment' ? 'paid:' + t.date : 'renewed');}}>确认{t.type === 'payment' ? '已缴费' : '已续保'}</button>
                  </div>
                </article>)}
                {!tasks.length && <p className="py-8 text-center text-sm text-gray-500">暂无已知的30天内待缴记录</p>}
              </div>
              <div className="hidden sm:block overflow-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="table-header">
                    <tr>
                      {["客户 / 保单", "剩余期数", "下次缴费 / 本期应缴", "操作"].map(
                        (x) => (
                          <th key={x} className="text-left p-3 border-b border-gray-100">
                            {x}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.policy.id + t.type} className="border-b border-gray-100">
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
                        <td className="p-3">
                          {remainingLabel(t.policy)}
                        </td>
                        <td className="p-3">
                          <PaymentDate date={t.date} estimated={t.estimated}/>
                          <div className="mt-2 tabular-nums">{formatMoney(t.amount, t.policy.mingya?.currency)}</div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {t.type === "payment" && (
                              <button
                                disabled={busy}
                                className={btn}
                                onClick={() =>
                                  mark(t.policy, "contact", t.date)
                                }
                              >
                                {t.policy.payments.find(
                                  (q) => q.date === t.date,
                                )?.contactedAt
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
                    当前没有已知的30天内待缴记录。日期不全的保单请到“全部保单”核对。
                  </p>
                )}
              </div>
              </>
            )}
          </div>
        </>
      )}
      {modal && (
        <WorkspaceDialog
          title={modal === 'detail' ? '保单详情' : modal === 'import' ? '导入预览' : modal === 'settings' ? '通知设置' : modal === 'email' ? '邮件预览' : modal === 'done' ? '导入完成' : modal === 'renewed' ? '确认本次已续保' : '确认本期已缴费'}
          compact={modal === 'settings' || modal.startsWith('paid:') || modal === 'renewed'}
          onClose={() => {
            if (busy) return;
            if (detailDirty && modal === 'detail' && !window.confirm('资料尚未保存，确认放弃修改？')) return;
            setDetailDirty(false);
            setModal('');
          }}>
          {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
            {modal === "import" && (
              <>
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
                  <div key={id} className="my-3 rounded-lg border border-gray-200 p-3">
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
                      className="input mt-2"
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
                      {role === "insured" &&
                        rows
                          .map((r, i) => ({ r, i }))
                          .filter(
                            ({ r }) =>
                              r.applicant === p.insured && !inactive(r.status),
                          )
                          .filter(
                            (x, i, a) =>
                              a.findIndex(
                                (y) =>
                                  identity(y.r, "applicant") ===
                                  identity(x.r, "applicant"),
                              ) === i,
                          )
                          .map(({ r, i }) => (
                            <option key={"batch:" + i} value={"batch:" + i}>
                              本次导入的投保人：{r.applicant} · 手机尾号{" "}
                              {r.phone?.slice(-4) || "无"}
                            </option>
                          ))}
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

                <p className="text-sm text-gray-500 my-3">
                  发送服务接通后，每日汇总未来30天及逾期待办；同一保单只列最新待缴期次。
                </p>
                <label className="block my-3">
                  收件邮箱
                  <input
                    type="email"
                    className="input mt-2"
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
                    className="input mt-2"
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
              <PolicyDetail
                onDirtyChange={setDetailDirty}
                policy={selected}
                contacts={contacts}
                busy={busy}
                onSave={async (p) => {
                  if (data.policies.some(x => x.id !== p.id && key(x) === key(p))) {
                    setError("该公司与保单号已存在，请通过导入合并更新。");
                    return false;
                  }
                  const next = {
                    ...data,
                    policies: data.policies.some((x) => x.id === p.id)
                      ? data.policies.map((x) => (x.id === p.id ? p : x))
                      : [...data.policies, p],
                  };
                  if (await persist(next)) {
                    setSelected(p);
                    return true;
                  }
                  return false;
                }}
                onMark={(date) => mark(selected, "payment", date)}
              />
            )}
            {(modal.startsWith("paid:") || modal === "renewed") && selected && (
              <>
                <p className="my-4">
                  {selected.productName} · {selected.policyNumber} ·{" "}
                  {modal.split(":")[1]}
                </p>
                <button
                  disabled={busy}
                  className={btn}
                  onClick={async () => {
                    const saved = await mark(
                      selected,
                      modal === "renewed" ? "renewal" : "payment",
                      modal.split(":")[1],
                    );
                    if (saved) setModal("");
                  }}
                >
                  {busy ? "正在保存…" : "确认标记"}
                </button>
              </>
            )}
        </WorkspaceDialog>
      )}
    </div>
  );
}
