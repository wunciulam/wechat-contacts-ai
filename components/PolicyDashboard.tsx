import Button, { IconButton } from "./ui/Button";
import Input, { SearchInput } from "./ui/Input";
import { excludedPolicyImport } from "../services/policyImportRules";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import PolicyStatus from "./PolicyStatus";
import CustomerTags from "./CustomerTags";
import PolicyPaymentSummary, { formatMoney } from "./PolicyPaymentSummary";
import {
  ManagedPolicy,
  dueItems,
  nextPayment,
  today,
} from "../services/renewal";

import React, { useState, useMemo } from "react";
import { Contact, Policy } from "../types";
import {
  Search,
  Shield,
  ChevronDown,
  Edit2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
  Upload,
  Bell,
} from "lucide-react";
import { PageHeader } from "./PageHeader";

interface PolicyDashboardProps {
  contacts: Contact[];
  embedded?: boolean;
  onOpenCustomer?: (contact: Contact) => void;
  scopeContactId?: string | null;
  onClearScope?: () => void;
  onPolicyDetail?: (policy: Policy) => void;
  onReminders?: () => void;
  onImport?: () => void;
  reminderCount?: number;
  filterTags: Set<string>;
  followUpFilter: "idle" | "following" | "contacted" | null;
  onEditContact: (contact: Contact) => void;
  onAddPolicy: () => void;
  onBatchDeleteContacts?: (ids: string[]) => void;
  onDeletePolicy?: (contactId: string, policyId: string) => void;
  onDeletePolicies?: (
    contactId: string,
    policyIds: string[],
    requestId: string,
  ) => Promise<void>;
}

const PolicyDashboard: React.FC<PolicyDashboardProps> = ({
  embedded = false,
  onOpenCustomer,
  contacts,
  scopeContactId,
  onClearScope,
  filterTags,
  followUpFilter,
  onEditContact,
  onAddPolicy,
  onBatchDeleteContacts,
  onDeletePolicy,
  onDeletePolicies,
  onPolicyDetail,
  onReminders,
  onImport,
  reminderCount = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  React.useEffect(() => {
    if (scopeContactId) setExpandedContactIds(new Set([scopeContactId]));
  }, [scopeContactId]);

  const [selectedPolicies, setSelectedPolicies] = useState<
    Record<string, Set<string>>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<{
    contactId: string;
    policies: Policy[];
    requestId: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false),
    [deleteError, setDeleteError] = useState("");
  const [compactTable, setCompactTable] = useState(
    () => window.innerWidth < 640,
  );
  React.useEffect(() => {
    const update = () => setCompactTable(window.innerWidth < 640);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const widthKey = "insurance-policy-actions-width";
  const clampWidth = (value: number, max = 360) =>
    Math.min(max, Math.max(112, value));
  const [actionWidth, setActionWidth] = useState(() => {
    try {
      const n = Number(localStorage.getItem(widthKey));
      return Number.isFinite(n) && n >= 112 ? clampWidth(n) : 128;
    } catch {
      return 128;
    }
  });
  const widthRef = React.useRef(actionWidth),
    drag = React.useRef<{ x: number; width: number } | null>(null);
  const resize = (width: number, save = false) => {
    const n = clampWidth(width, compactTable ? 160 : 360);
    widthRef.current = n;
    setActionWidth(n);
    if (save)
      try {
        localStorage.setItem(widthKey, String(n));
      } catch {}
  };
  const visibleActionWidth = compactTable
    ? Math.min(actionWidth, 160)
    : actionWidth;
  const columns = [
    44,
    280,
    240,
    140,
    160,
    260,
    180,
    130,
    120,
    visibleActionWidth,
  ];
  const togglePolicy = (contactId: string, id: string) =>
    setSelectedPolicies((prev) => {
      const ids = new Set(prev[contactId] || []);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...prev, [contactId]: ids };
    });
  const askDelete = (contactId: string, policies: Policy[]) => {
    if (!policies.length || deleting) return;
    setDeleteError("");
    setDeleteTarget({ contactId, policies, requestId: crypto.randomUUID() });
  };
  const confirmDelete = async () => {
    if (!deleteTarget || !onDeletePolicies || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const ids = deleteTarget.policies.map((p) => p.id);
      await onDeletePolicies(
        deleteTarget.contactId,
        ids,
        deleteTarget.requestId,
      );
      const removed = new Set(ids);
      setSelectedPolicies((prev) =>
        Object.fromEntries(
          (Object.entries(prev) as [string, Set<string>][]).map(
            ([contactId, selected]) => [
              contactId,
              new Set([...selected].filter((id) => !removed.has(id))),
            ],
          ),
        ),
      );
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "删除未保存，请重试。");
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedContactIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const filteredContactsWithPolicies = useMemo(() => {
    let result = contacts
      .map((c) => ({
        ...c,
        policies: c.policies?.filter((p) => !excludedPolicyImport(p.status)),
      }))
      .filter((c) => c.policies && c.policies.length > 0);
    if (scopeContactId) result = result.filter((c) => c.id === scopeContactId);

    if (filterTags.size > 0) {
      result = result.filter((c) => c.tags.some((tag) => filterTags.has(tag)));
    }

    if (followUpFilter !== null) {
      result = result.filter((c) => c.followUpStatus === followUpFilter);
    }

    if (searchTerm && searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      result = result.filter((c) => {
        const matchesContact =
          (c.remarkName && c.remarkName.toLowerCase().includes(lower)) ||
          (c.nickname && c.nickname.toLowerCase().includes(lower)) ||
          (c.phoneNumber && String(c.phoneNumber).includes(lower));
        const matchesPolicy = c.policies?.some(
          (p) =>
            (p.policyNumber && p.policyNumber.toLowerCase().includes(lower)) ||
            (p.productName && p.productName.toLowerCase().includes(lower)),
        );
        return matchesContact || matchesPolicy;
      });
    }

    return result;
  }, [contacts, searchTerm, filterTags, followUpFilter, scopeContactId]);

  const allSelected =
    filteredContactsWithPolicies.length > 0 &&
    filteredContactsWithPolicies.every((c) => selectedIds.has(c.id));

  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredContactsWithPolicies.map((c) => c.id)));
  };

  const handleBatchDelete = () => {
    if (
      selectedIds.size > 0 &&
      confirm(
        `确定要删除选中的 ${selectedIds.size} 位投保客户吗？此操作将彻底移除他们的所有资料。`,
      )
    ) {
      onBatchDeleteContacts?.(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getTotals = (policies: Policy[]) => {
    const count = policies.length;
    const totals: Record<string, number> = {};
    policies.forEach((p) => {
      // 只计算生效的保单（status 包含"有效"或"正式"，排除"终止"、"退保"、"撤单"）
      const status = p.status || "";
      const isActive =
        (status.includes("有效") || status.includes("正式")) &&
        !status.includes("终止") &&
        !status.includes("退保") &&
        !status.includes("撤单");

      if (isActive) {
        const premiumStr = String(p.premium || "0");
        const val = parseFloat(premiumStr.replace(/[^0-9.]/g, ""));
        if (!isNaN(val)) {
          const currency = p.mingya?.currency || "CNY";
          totals[currency] = (totals[currency] || 0) + val;
        }
      }
    });
    return {
      count,
      totalPremium:
        Object.entries(totals)
          .map(([currency, amount]) => formatMoney(amount, currency))
          .join(" / ") || formatMoney(0),
    };
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-white relative">
      {!embedded && (
        <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100">
          <PageHeader
            title={
              filterTags.size > 0
                ? `筛选: ${filterTags.size} 个标签`
                : "客户保单"
            }
            count={filteredContactsWithPolicies.length}
            selectedCount={selectedIds.size}
            allSelected={allSelected}
            onSelectAll={handleSelectAll}
            actionButton={
              <div className="flex gap-2 flex-wrap">
                {scopeContactId && onClearScope && (
                  <Button
                    className=""
                    onClick={onClearScope}
                    variant="secondary"
                  >
                    全部保单
                  </Button>
                )}
                <Button onClick={onReminders} className="" variant="secondary">
                  <Bell size={16} />
                  续期提醒（{reminderCount}）
                </Button>
                <Button onClick={onAddPolicy} className="" variant="primary">
                  <Plus size={16} />
                  <span>录入保单</span>
                </Button>
              </div>
            }
            searchBox={
              <div className="relative w-full sm:w-72">
                <SearchInput
                  type="text"
                  placeholder="搜索客户、保单号、险种…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            }
          />
        </div>
      )}
      {embedded && (
        <div className="flex flex-wrap items-center gap-3 p-5">
          <span className="mr-auto text-sm text-gray-600">
            共{" "}
            {filteredContactsWithPolicies.reduce(
              (n, c) => n + (c.policies?.length || 0),
              0,
            )}{" "}
            份保单
          </span>
          <Button size="sm" onClick={onImport}>
            导入保单
          </Button>
          <Button size="sm" onClick={onAddPolicy}>
            录入保单
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar space-y-4 md:space-y-6">
        {filteredContactsWithPolicies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Shield size={40} className="mb-4 opacity-50" />
            <p className="text-sm">
              {scopeContactId ? "该客户暂无可展示保单" : "暂无符合条件的保单"}
            </p>
          </div>
        ) : (
          filteredContactsWithPolicies.map((contact) => {
            const { count, totalPremium } = getTotals(contact.policies || []);
            const policyIds = new Set(
              (contact.policies || []).map((p) => p.id),
            );
            const checkedPolicies = new Set(
              [...(selectedPolicies[contact.id] || [])].filter((id) =>
                policyIds.has(id),
              ),
            );
            const policyAllSelected =
              policyIds.size > 0 && checkedPolicies.size === policyIds.size;
            const isExpanded = embedded || expandedContactIds.has(contact.id);
            const contactReminders = new Set(
              dueItems(
                (contact.policies || []).map((p) => ({
                  ...p,
                  payments: (p as ManagedPolicy).payments || [],
                })),
              ).map((t) => t.policy.id),
            ).size;
            const isSelected = selectedIds.has(contact.id);
            return (
              <div
                key={contact.id}
                className={`bg-white rounded-lg border transition-colors duration-150 overflow-hidden hover:border-gray-200 ${isSelected ? "border-gray-400" : "border-gray-100"}`}
              >
                {!embedded && (
                  <div
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(contact.id)}
                  >
                    <div className="flex items-start gap-4">
                      <Button
                        onClick={(e) => toggleSelect(contact.id, e)}
                        className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-colors ${isSelected ? "bg-gray-900 border-gray-900 text-white" : "bg-gray-100 border-gray-200 text-gray-600 font-medium text-lg hover:border-gray-300"}`}
                        variant="plain"
                      >
                        {isSelected ? (
                          <CheckSquare size={20} />
                        ) : (
                          contact.remarkName?.[0] || "?"
                        )}
                      </Button>
                      <div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="plain"
                            className="text-sm font-semibold text-gray-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCustomer?.(contact);
                            }}
                          >
                            {contact.remarkName || contact.nickname}
                          </Button>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums">
                            {contact.phoneNumber || "无手机号"}
                          </span>
                        </div>
                        {contactReminders > 0 && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReminders?.();
                            }}
                            className="text-xs text-amber-700 mt-2"
                            variant="plain"
                          >
                            {contactReminders} 份保单待处理
                          </Button>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <CustomerTags tags={contact.tags} />
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditContact(
                                contacts.find((c) => c.id === contact.id) ||
                                  contact,
                              );
                            }}
                            className="text-xs text-gray-500 hover:bg-gray-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 font-medium"
                            variant="plain"
                          >
                            <Edit2 size={10} /> 修改标签
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 md:justify-end border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">
                          保单数量
                        </div>
                        <div className="text-lg font-medium text-gray-700">
                          {count}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            份
                          </span>
                        </div>
                      </div>
                      <div className="text-right pr-4 border-r border-gray-100">
                        <div className="text-xs text-gray-500 font-medium">
                          单期保费合计
                        </div>
                        <div className="text-lg font-medium text-gray-900 tabular-nums">
                          {totalPremium}
                        </div>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180 text-gray-900" : ""}`}
                      />
                    </div>
                  </div>
                )}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 animate-in slide-in-from-top-2">
                    {onDeletePolicies && checkedPolicies.size > 0 && (
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="mr-auto text-gray-600">
                          已选 {checkedPolicies.size} 份保单
                        </span>
                        <Button
                          disabled={deleting}
                          className=""
                          onClick={() =>
                            setSelectedPolicies((prev) => ({
                              ...prev,
                              [contact.id]: new Set(),
                            }))
                          }
                          variant="secondary"
                        >
                          取消选择
                        </Button>
                        <Button
                          disabled={deleting}
                          className=""
                          onClick={() =>
                            askDelete(
                              contact.id,
                              (contact.policies || []).filter((p) =>
                                checkedPolicies.has(p.id),
                              ),
                            )
                          }
                          variant="primary"
                        >
                          删除所选
                        </Button>
                      </div>
                    )}
                    <div className="max-w-full bg-white rounded-lg border border-gray-200 overflow-x-auto">
                      <table
                        className="w-full table-fixed text-left text-sm"
                        style={{
                          minWidth: columns
                            .slice(onDeletePolicies ? 0 : 1)
                            .reduce((a, b) => a + b, 0),
                        }}
                      >
                        <colgroup>
                          {columns
                            .slice(onDeletePolicies ? 0 : 1)
                            .map((w, i) => (
                              <col
                                key={i}
                                style={
                                  i === (onDeletePolicies ? 1 : 0)
                                    ? undefined
                                    : { width: w }
                                }
                              />
                            ))}
                        </colgroup>
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs  border-b border-gray-200">
                          <tr className="divide-x divide-gray-100">
                            {onDeletePolicies && (
                              <th className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  aria-label={`全选${contact.remarkName || contact.nickname}的保单`}
                                  disabled={deleting}
                                  checked={policyAllSelected}
                                  ref={(e) => {
                                    if (e)
                                      e.indeterminate =
                                        checkedPolicies.size > 0 &&
                                        !policyAllSelected;
                                  }}
                                  onChange={() =>
                                    setSelectedPolicies((prev) => ({
                                      ...prev,
                                      [contact.id]: policyAllSelected
                                        ? new Set()
                                        : new Set(policyIds),
                                    }))
                                  }
                                />
                              </th>
                            )}
                            <th className="px-4 py-3">险种名称</th>
                            <th className="px-4 py-3">保单号</th>
                            <th className="px-4 py-3 text-right">保费</th>
                            <th className="px-4 py-3 whitespace-nowrap">
                              缴费方式 / 期间
                            </th>
                            <th className="px-4 py-3">下次缴费 / 应缴金额</th>
                            <th className="px-4 py-3">投保人/被保人</th>
                            <th className="px-4 py-3">生效日期</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="sticky right-0 z-20 border-l border-gray-200 bg-gray-50 px-4 py-3 text-right whitespace-nowrap">
                              操作
                              <span
                                role="separator"
                                tabIndex={0}
                                aria-orientation="vertical"
                                aria-label="调整操作列宽度"
                                aria-valuemin={112}
                                aria-valuemax={compactTable ? 160 : 360}
                                aria-valuenow={visibleActionWidth}
                                title="拖动调整操作列宽度；双击恢复默认"
                                className="absolute inset-y-0 left-0 w-2 cursor-col-resize touch-none select-none hover:bg-gray-200 focus:bg-gray-200"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  drag.current = {
                                    x: e.clientX,
                                    width: visibleActionWidth,
                                  };
                                  e.currentTarget.setPointerCapture(
                                    e.pointerId,
                                  );
                                }}
                                onPointerMove={(e) => {
                                  if (drag.current)
                                    resize(
                                      drag.current.width +
                                        drag.current.x -
                                        e.clientX,
                                    );
                                }}
                                onPointerUp={(e) => {
                                  if (!drag.current) return;
                                  drag.current = null;
                                  resize(widthRef.current, true);
                                  e.currentTarget.releasePointerCapture(
                                    e.pointerId,
                                  );
                                }}
                                onPointerCancel={() => {
                                  drag.current = null;
                                  resize(widthRef.current, true);
                                }}
                                onDoubleClick={() => resize(128, true)}
                                onKeyDown={(e) => {
                                  if (
                                    [
                                      "ArrowLeft",
                                      "ArrowRight",
                                      "Home",
                                      "End",
                                    ].includes(e.key)
                                  ) {
                                    e.preventDefault();
                                    resize(
                                      e.key === "Home"
                                        ? 112
                                        : e.key === "End"
                                          ? compactTable
                                            ? 160
                                            : 360
                                          : visibleActionWidth +
                                            (e.key === "ArrowLeft" ? 16 : -16),
                                      true,
                                    );
                                  }
                                }}
                              />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {contact.policies?.map((policy) => {
                            const managed = {
                              ...policy,
                              payments:
                                (policy as ManagedPolicy).payments || [],
                            };
                            const next = nextPayment(managed);
                            const reminders = dueItems([managed]);
                            return (
                              <tr
                                key={policy.id}
                                className="group hover:bg-gray-50 transition-colors"
                              >
                                {onDeletePolicies && (
                                  <td className="px-3 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label={`选择保单${policy.policyNumber || policy.productName}`}
                                      checked={checkedPolicies.has(policy.id)}
                                      disabled={deleting}
                                      onChange={() =>
                                        togglePolicy(contact.id, policy.id)
                                      }
                                    />
                                  </td>
                                )}
                                <td className="px-4 py-3 font-medium text-gray-700">
                                  <Button
                                    className="max-w-full break-words text-left hover:underline"
                                    onClick={() => onPolicyDetail?.(policy)}
                                    variant="plain"
                                  >
                                    {policy.productName}
                                  </Button>
                                </td>
                                <td
                                  title={policy.policyNumber}
                                  className="overflow-hidden text-ellipsis px-4 py-3 whitespace-nowrap tabular-nums text-gray-500 text-xs"
                                >
                                  {policy.policyNumber}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-medium text-gray-900">
                                  {formatMoney(
                                    policy.premium,
                                    policy.mingya?.currency,
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  <span className="block whitespace-nowrap">
                                    {policy.paymentFrequency || "待补充"}
                                  </span>
                                  <span className="mt-1 block whitespace-nowrap">
                                    {policy.paymentYears || "待补充"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs">
                                  <PolicyPaymentSummary policy={managed} />
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  <span className="block break-words">
                                    {policy.applicant}
                                  </span>
                                  <span className="mt-1 block break-words text-gray-500">
                                    {policy.insured}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                                  {policy.effectiveDate}
                                </td>
                                <td className="px-4 py-3">
                                  <PolicyStatus status={policy.status} />
                                </td>
                                <td className="sticky right-0 z-10 border-l border-gray-200 bg-white px-4 py-3 text-right whitespace-nowrap group-hover:bg-gray-50">
                                  <Button
                                    className=""
                                    onClick={() => onPolicyDetail?.(policy)}
                                    variant="ghost"
                                    size="sm"
                                  >
                                    详情
                                  </Button>
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onDeletePolicies)
                                        askDelete(contact.id, [policy]);
                                      else
                                        onDeletePolicy?.(contact.id, policy.id);
                                    }}
                                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="删除保单"
                                    aria-label="删除保单"
                                  >
                                    <Trash2 size={14} />
                                  </IconButton>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {deleteTarget && (
        <WorkspaceDialog
          title={`删除 ${deleteTarget.policies.length} 份保单`}
          size="confirm"
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <p className="text-sm leading-relaxed text-gray-600">
            所选保单及缴费记录将从关联客户中移除。
          </p>
          <ul className="mt-4 space-y-3">
            {deleteTarget.policies.map((p) => (
              <li key={p.id} className="border-b border-gray-100 pb-3">
                <p className="text-sm break-words">{p.productName}</p>
                <p className="mt-1 text-xs text-gray-500 break-all">
                  {p.policyNumber || "未填写保单号"}
                </p>
              </li>
            ))}
          </ul>
          {deleteError && (
            <p role="alert" className="mt-3 text-sm text-danger-600">
              {deleteError}
            </p>
          )}
          <WorkspaceDialogFooter>
            <Button
              className=""
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              className=""
              disabled={deleting}
              onClick={confirmDelete}
              variant="primary"
            >
              {deleting ? "正在删除…" : "确认删除"}
            </Button>
          </WorkspaceDialogFooter>
        </WorkspaceDialog>
      )}
      {selectedIds.size > 0 && (
        <div className="fixed sm:absolute bottom-4 sm:bottom-8 left-4 sm:left-1/2 right-4 sm:right-auto sm:-translate-x-1/2 bg-white shadow-lg border border-gray-200 rounded-lg px-2 py-2 flex items-center gap-2 animate-in slide-in-from-bottom-4 z-50 overflow-x-auto no-scrollbar">
          <div className="px-3 sm:px-4 py-2 bg-gray-900 rounded text-xs sm:text-sm font-medium text-white whitespace-nowrap">
            {selectedIds.size} 位客户
          </div>
          <Button
            onClick={handleBatchDelete}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap"
            variant="plain"
          >
            <Trash2 size={14} className="sm:w-4 sm:h-4" />
            <span>批量删除</span>
          </Button>
          <IconButton
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-500 hover:text-gray-900 shrink-0"
            aria-label="关闭"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </IconButton>
        </div>
      )}
    </div>
  );
};

export default PolicyDashboard;
