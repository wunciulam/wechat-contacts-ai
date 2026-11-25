import {matchesCustomerFilters} from './services/customerFilters';
import AiSettingsDialog from "./components/AiSettingsDialog";
import CustomerDetailDialog, {
  type CustomerRequest,
} from "./components/CustomerDetailDialog";
import FollowupWorkspace from "./components/FollowupWorkspace";
import { saveFollowupBundle } from "./services/followupWorkspaceStorage";
import Button, { IconButton } from "./components/ui/Button";
import {
  categoryIds,
  contactKey,
  contactNameKey,
} from "./services/contactIdentity";
import { excludedPolicyImport } from "./services/policyImportRules";
import {
  saveFollowup,
  saveCustomerProfile,
  saveContactCategory,
} from "./services/followupStorage";
import { rememberRenewalSnapshot } from "./services/renewalCache";
import { migrate, projectContacts, mergePolicies } from "./services/renewal";
import RenewalWorkspace from "./components/RenewalWorkspace";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import {
  Menu,
  Users,
  ClipboardList,
  FileText,
  Cloud,
  CloudOff,
} from "lucide-react";
import { ContactList } from "./components/ContactList";
import FollowUpDashboard from "./components/FollowUpDashboard";
import PolicyDashboard from "./components/PolicyDashboard"; // New Component
import ImportModal from "./components/ImportModal";
import MingyaImportModal from "./components/MingyaImportModal";
import {
  parseMingyaPayload,
  canonicalContactData,
  type ImportPlan,
  type MingyaPayload,
} from "./services/mingyaImport";
import BatchTagModal from "./components/BatchTagModal";
import ConfirmModal from "./components/ConfirmModal";
import QuickFollowUpModal from "./components/QuickFollowUpModal";
import ChatFollowUpDialog from "./components/ChatFollowUpDialog";
import ManualPolicyModal from "./components/ManualPolicyModal";
import CategoryBoard from "./components/CategoryBoard";
import CategoryManager from "./components/CategoryManager";
import {
  Contact,
  NewContact,
  ProgressRecord,
  ExtractedTableData,
  Policy,
  Category,
} from "./types";
import {
  saveToCloud,
  loadFromCloud,
  isSupabaseConfigured,
  loadLegacyContactsTable,
  subscribeToDataChanges,
  broadcastDataChange,
  readContactImportSnapshot,
  commitContactImport,
  archiveMingyaCapture,
  type ContactImportSnapshot,
} from "./services/supabaseService";

const CATEGORIES_STORAGE_KEY = "wechat-categories";

// 默认类目
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat_default_1",
    name: "潜在客户",
    color: "#F59E0B",
    icon: "UserPlus",
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "cat_default_2",
    name: "重点跟进",
    color: "#EF4444",
    icon: "Star",
    order: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "cat_default_3",
    name: "已成交",
    color: "#10B981",
    icon: "CheckCircle",
    order: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const FOLLOW_UP_TAG = "跟进中";
const CLOSED_CUSTOMER_TAG = "成交客户";

// Helper function to categorize policies based on product name
const getPolicyCategory = (name: string): string | null => {
  if (!name) return null;
  const n = name;
  if (
    n.includes("重疾") ||
    n.includes("重大疾病") ||
    n.includes("癌") ||
    n.includes("百病") ||
    n.includes("恶性肿瘤")
  )
    return "重疾险";
  if (
    n.includes("年金") ||
    n.includes("养老") ||
    n.includes("退休") ||
    n.includes("教育")
  )
    return "养老金";
  if (
    n.includes("医疗") ||
    n.includes("住院") ||
    n.includes("医保") ||
    n.includes("门诊")
  )
    return "医疗险";
  if (
    n.includes("寿") ||
    n.includes("增额") ||
    n.includes("两全") ||
    n.includes("储蓄") ||
    n.includes("分红") ||
    n.includes("万能")
  )
    return "储蓄险";
  if (n.includes("意外")) return "意外险";
  if (n.includes("车")) return "车险";
  return "其他保险";
};

/**
 * Helper to automatically apply tags based on business rules:
 * Only auto-apply "成交客户" tag for contacts with policies.
 * Other tags are managed manually by users.
 */
const applyAutoTags = (contact: Contact): Contact => {
  let newTagsSet = new Set(contact.tags);
  let changed = false;

  // Only auto-apply "成交客户" tag for policy records
  const hasPolicies = contact.policies && contact.policies.length > 0;
  if (hasPolicies && !newTagsSet.has(CLOSED_CUSTOMER_TAG)) {
    newTagsSet.add(CLOSED_CUSTOMER_TAG);
    changed = true;
  }

  if (changed) {
    return {
      ...contact,
      tags: Array.from(newTagsSet),
    };
  }

  return contact;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const cacheContactsLocally = (value: Contact[]) => {
  try {
    const raw = JSON.stringify(value);
    localStorage.setItem("wechat-contacts", raw);
    localStorage.setItem("wechat-contacts-backup", raw);
  } catch {
    console.warn("本地备份不可写，继续使用数据库数据");
  }
};

const App: React.FC = () => {
  const [policyImportFiles, setPolicyImportFiles] = useState<FileList | null>(
    null,
  );
  const [contacts, setContacts] = useState<Contact[]>([]);
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;
  const [contactsSyncError, setContactsSyncError] = useState("");
  const contactsWriteFailedRef = useRef(false);
  const contactsWriteRef = useRef<Promise<unknown>>(Promise.resolve());
  const skipImportSyncRef = useRef<Contact[] | null>(null);
  const importSavingRef = useRef(false);
  const [isMingyaImportOpen, setIsMingyaImportOpen] = useState(false);
  const [mingyaPayload, setMingyaPayload] = useState<unknown>(null);

  const [selectedCategories,setSelectedCategories]=useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<
    "contacts" | "followups" | "policies"
  >("contacts");
  const [detailPolicyId, setDetailPolicyId] = useState<string | undefined>();
  const [policyScopeId, setPolicyScopeId] = useState<string | null>(null);
  const changeView = (view: typeof currentView) => {
    setPolicyScopeId(null);
    setCurrentView(view);
  };
  const [policyContactId, setPolicyContactId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 跟进状态筛选
  const [followUpFilter, setFollowUpFilter] = useState<
    "idle" | "following" | "contacted" | null
  >(null);

  // 类目状态
  const [categories, setCategories] = useState<Category[]>([]);
  const categoryLive=useRef(categories);categoryLive.current=categories;
  const categoryWrites=useRef<Promise<unknown>>(Promise.resolve());
  async function ensureCategory(name:string):Promise<Category>{let result:Category|undefined;const pending=categoryWrites.current.then(async()=>{const existing=categoryLive.current.find(c=>c.name.trim()===name.trim());if(existing){result=existing;return;}const stamp=Date.now();result={id:crypto.randomUUID(),name:name.trim(),color:"#f59e0b",icon:"Tag",order:categoryLive.current.length,createdAt:stamp,updatedAt:stamp};const next=[...categoryLive.current,result];if(!await saveToCloud("categories",next))throw Error("分类未保存，请重试。");categoryLive.current=next;setCategories(next);localStorage.setItem(CATEGORIES_STORAGE_KEY,JSON.stringify(next));});categoryWrites.current=pending.catch(()=>{});await pending;return result!;}
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSettingsOpen,setAiSettingsOpen]=useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerRequest | null>(
    null,
  );
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [chatImport, setChatImport] = useState<{
    contactId?: string;
    restoreProfile?: boolean;
  } | null>(null);

  // Quick Follow Up Modal
  const [isQuickFollowUpOpen, setIsQuickFollowUpOpen] = useState(false);
  const [quickFollowUpContactId, setQuickFollowUpContactId] = useState<
    string | undefined
  >(undefined);
  const [editingRecord, setEditingRecord] = useState<{
    contactId: string;
    record: ProgressRecord;
  } | null>(null);

  // Manual Policy Modal
  const [isManualPolicyOpen, setIsManualPolicyOpen] = useState(false);

  // Selection & Batch Ops
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(),
  );
  const [batchModalState, setBatchModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "remove";
  }>({ isOpen: false, mode: "add" });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Debug: capture runtime style system + navigation state
  useEffect(() => {
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      const bodyStyles = getComputedStyle(document.body);
      const primary600 = rootStyles
        .getPropertyValue("--color-primary-600")
        ?.trim();
      const bodyBg = bodyStyles.backgroundColor;

      // Detect whether .btn/.btn-primary rules are actually active
      const probe = document.createElement("button");
      probe.className = "btn btn-primary";
      probe.style.position = "absolute";
      probe.style.left = "-9999px";
      probe.textContent = "probe";
      document.body.appendChild(probe);
      const probeStyles = getComputedStyle(probe);
      const probeBg = probeStyles.backgroundColor;
      const probeMinH = probeStyles.minHeight;
      probe.remove();

      console.log("Style system check:", {
        origin: window.location.origin,
        bodyBg,
        primary600,
        probeBg,
        probeMinH,
      });
    } catch (e) {
      console.error("Style system check failed:", e);
    }
  }, []);

  useEffect(() => {
    console.log("Navigation state:", {
      currentView,
      selectedTagsCount: selectedTags.size,
      contactsCount: contacts.length,
      selectedContactIdsCount: selectedContactIds.size,
      isLoaded,
    });
  }, [
    currentView,
    selectedTags,
    contacts.length,
    selectedContactIds,
    isLoaded,
  ]);

  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.dataset.mingyaImport = "1";
    const receive = (event: MessageEvent) => {
      if (importSavingRef.current) return;
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        event.data?.type !== "MINGYA_IMPORT_PREVIEW"
      )
        return;
      try {
        const payload = parseMingyaPayload(event.data.payload);
        setMingyaPayload(payload);
        setIsMingyaImportOpen(true);
      } catch {
        /* Invalid messages cannot change customer data. */
      }
    };
    window.addEventListener("message", receive);
    return () => {
      delete document.documentElement.dataset.mingyaImport;
      window.removeEventListener("message", receive);
    };
  }, [isLoaded]);

  const acceptSavedPolicyContacts = (saved: Contact[]) => {
    skipImportSyncRef.current = saved;
    setContacts(saved);
  };
  const beforePolicySave = async () => {
    await contactsWriteRef.current;
    if (contactsWriteFailedRef.current)
      throw new Error("客户资料尚未同步成功，请先重试保存。");
  };

  const loadMingyaSnapshot = async (): Promise<ContactImportSnapshot> => {
    await contactsWriteRef.current;
    const localVersion = JSON.stringify(contactsRef.current);
    const snapshot = await readContactImportSnapshot();
    if (
      canonicalContactData(snapshot.contacts) !==
      canonicalContactData(contactsRef.current)
    ) {
      throw new Error(
        "云端与当前页面的客户资料不同，请先完成同步或刷新后再导入。",
      );
    }
    return { ...snapshot, localVersion };
  };

  const applyMingyaImport = async (
    snapshot: ContactImportSnapshot,
    plan: ImportPlan,
    payload: MingyaPayload,
  ) => {
    if (importSavingRef.current) throw new Error("正在保存，请稍候。");
    if (JSON.stringify(contactsRef.current) !== snapshot.localVersion)
      throw new Error("客户资料已变化，请关闭后重新预览导入。");
    importSavingRef.current = true;
    try {
      try {
        localStorage.setItem(
          "wechat-contacts-before-mingya",
          JSON.stringify(snapshot.contacts),
        );
      } catch {
        throw new Error("导入前备份未成功，请释放浏览器存储空间后重试。");
      }
      const captureId = await archiveMingyaCapture(snapshot, payload);
      const importedKeys = new Set(
        plan.rows
          .filter(
            (row) => row.action === "新增保单" || row.action === "补充 / 更新",
          )
          .map((row) => row.key),
      );
      for (const contact of plan.contacts)
        for (const policy of contact.policies || []) {
          if (
            policy.mingya &&
            importedKeys.has(policy.mingya.key) &&
            !policy.mingya.captureId
          )
            policy.mingya.captureId = captureId;
        }
      if (JSON.stringify(contactsRef.current) !== snapshot.localVersion)
        throw new Error("客户资料已变化，请重新预览后导入。");
      const renewalData = {
        ...snapshot.renewalData,
        policies: mergePolicies(
          snapshot.renewalData.policies,
          migrate(plan.contacts),
        ),
      };
      const contacts = projectContacts(plan.contacts, renewalData.policies);
      await commitContactImport(snapshot, contacts, renewalData);
      rememberRenewalSnapshot(renewalData);
      skipImportSyncRef.current = contacts;
      setContacts(contacts);
      setCurrentView("policies");
    } finally {
      importSavingRef.current = false;
    }
  };

  // 1. Load Data - 优先从云端加载
  useEffect(() => {
    const loadData = async () => {
      console.log("Supabase配置状态:", isSupabaseConfigured());

      // 优先从云端加载
      if (isSupabaseConfigured()) {
        try {
          console.log("正在从云端加载数据...");
          const cloudData = await loadFromCloud("contacts");
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            console.log("从云端加载成功，联系人数量:", cloudData.length);
            const migratedData = cloudData.map((c) => {
              const baseContact: Contact = {
                ...c,
                dealProducts: Array.isArray(c.dealProducts)
                  ? c.dealProducts
                  : c.dealProducts
                    ? [c.dealProducts]
                    : [],
                intentProducts: Array.isArray(c.intentProducts)
                  ? c.intentProducts
                  : [],
                policies: c.policies || [],
              };
              return applyAutoTags(baseContact);
            });
            skipImportSyncRef.current = migratedData;
            setContacts(migratedData);
            cacheContactsLocally(migratedData);
            setIsLoaded(true);
            console.log("从云端加载成功，联系人数量:", cloudData.length);
            return;
          } else {
            console.log("云端没有数据");
          }

          // 兼容旧版：如果 app_data 没数据，尝试从 contacts 表恢复
          console.log("尝试从旧版 contacts 表恢复...");
          const legacyRows = await loadLegacyContactsTable();
          if (
            legacyRows &&
            Array.isArray(legacyRows) &&
            legacyRows.length > 0
          ) {
            const migratedData = legacyRows.map((r: any) => {
              const baseContact: Contact = {
                id: String(r.id),
                wxid: r.wxid || "",
                nickname: r.nickname || "",
                remarkName: r.remark_name || r.remarkName || r.nickname || "",
                remarkInfo: r.remark_info || r.remarkInfo || "",
                tags: Array.isArray(r.tags)
                  ? r.tags
                  : r.tags
                    ? Array.isArray(r.tags)
                      ? r.tags
                      : []
                    : [],
                avatarUrl: r.avatar_url || r.avatarUrl,
                addedAt: Number(r.added_at || r.addedAt || Date.now()),
                lastDate: r.last_date || r.lastDate,
                progressHistory: Array.isArray(r.progress_history)
                  ? r.progress_history
                  : r.progressHistory || [],
                progress: r.progress || undefined,
                dealProducts: Array.isArray(r.deal_products)
                  ? r.deal_products
                  : r.dealProducts
                    ? Array.isArray(r.dealProducts)
                      ? r.dealProducts
                      : [r.dealProducts]
                    : [],
                intentProducts: Array.isArray(r.intent_products)
                  ? r.intent_products
                  : r.intentProducts || [],
                followUpStatus: r.follow_up_status || r.followUpStatus,
                policies: [],
              };
              return applyAutoTags(baseContact);
            });

            console.log(
              "旧版 contacts 表恢复成功，联系人数量:",
              migratedData.length,
            );
            setContacts(migratedData);
            cacheContactsLocally(migratedData);

            // 写回新同步表，避免下次再丢
            await saveToCloud("contacts", migratedData);
            setIsLoaded(true);
            console.log(
              "旧版 contacts 表恢复成功，联系人数量:",
              migratedData.length,
            );
            return;
          } else {
            console.log("旧版 contacts 表也没有数据");
          }
        } catch (e) {
          console.error("从云端加载失败:", e);
        }
      }

      // 云端没有数据，从本地存储加载
      const saved = localStorage.getItem("wechat-contacts");
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log("从本地存储加载，联系人数量:", parsedData.length);
            const migratedData = parsedData.map((c) => {
              const baseContact: Contact = {
                ...c,
                dealProducts: Array.isArray(c.dealProducts)
                  ? c.dealProducts
                  : c.dealProducts
                    ? [c.dealProducts]
                    : [],
                intentProducts: Array.isArray(c.intentProducts)
                  ? c.intentProducts
                  : [],
                policies: c.policies || [],
              };
              return applyAutoTags(baseContact);
            });
            setContacts(migratedData);

            // 同步到云端备份
            if (isSupabaseConfigured() && migratedData.length > 0) {
              console.log("正在同步到云端...");
              await saveToCloud("contacts", migratedData);
            }
            setIsLoaded(true);
            console.log("从本地存储加载，联系人数量:", parsedData.length);
            return;
          }
        } catch (e) {
          console.error("本地数据解析失败:", e);
        }
      }

      // 尝试从备份恢复
      const backup = localStorage.getItem("wechat-contacts-backup");
      if (backup) {
        try {
          const parsedData = JSON.parse(backup);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log("从备份恢复数据...");
            setContacts(parsedData);
            cacheContactsLocally(parsedData);
            setIsLoaded(true);
            console.log("从备份恢复数据...");
            return;
          }
        } catch (e) {
          console.error("备份恢复失败:", e);
        }
      }

      setIsLoaded(true);
      console.log("没有找到任何数据");
    };

    loadData();
  }, []);

  // 2. Save Data - 强制保存到云端
  useEffect(() => {
    if (isLoaded && contacts.length > 0) {
      cacheContactsLocally(contacts);
      if (skipImportSyncRef.current === contacts) {
        skipImportSyncRef.current = null;
        return;
      }
      if (isSupabaseConfigured()) {
        contactsWriteRef.current = contactsWriteRef.current
          .catch(() => {})
          .then(async () => {
            const success = await saveToCloud("contacts", contacts);
            contactsWriteFailedRef.current = !success;
            setContactsSyncError(
              success ? "" : "客户资料未保存到数据库，请重试。",
            );
          })
          .catch(() => {
            contactsWriteFailedRef.current = true;
            setContactsSyncError("客户资料未保存到数据库，请重试。");
          });
      }
    }
  }, [contacts, isLoaded]);

  // 3. 订阅实时数据变化（暂时禁用，调试用）
  useEffect(() => {
    // console.log('⏸️ 实时订阅已禁用');
    return () => {};
  }, []);

  // 4. 加载类目数据 - 优先从云端加载
  useEffect(() => {
    const loadCategories = async () => {
      // 优先从云端加载
      if (isSupabaseConfigured()) {
        try {
          const cloudData = await loadFromCloud("categories");
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            console.log("从云端加载类目成功:", cloudData.length);
            setCategories(cloudData);
            localStorage.setItem(
              CATEGORIES_STORAGE_KEY,
              JSON.stringify(cloudData),
            );
            return;
          }
        } catch (e) {
          console.error("从云端加载类目失败:", e);
        }
      }

      // 云端没有，从本地存储加载
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
            return;
          }
        } catch (e) {
          console.error("类目数据解析失败:", e);
        }
      }
      setCategories(DEFAULT_CATEGORIES);
    };
    loadCategories();
  }, []);

  // 5. 保存类目数据 - 同时保存到云端
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      if (isSupabaseConfigured()) {
        saveToCloud("categories", categories).then((success) => {
          console.log("类目云端保存结果:", success ? "成功" : "失败");
        });
      }
    }
  }, [categories]);

  // Derived State
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags))).sort();

  // --- Actions ---

  const handleToggleTag = (tag: string | null) => {
    if (tag === null) {
      setSelectedTags(new Set());
      return;
    }

    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const handleToggleAllTags = (select: boolean) => {
    if (select) {
      setSelectedTags(new Set(allTags));
    } else {
      setSelectedTags(new Set());
    }
  };

  const handleSaveContact = async (
    newContactDataArray: NewContact[],
    requestId?: string,
  ) => {
    for (const [index, data] of newContactDataArray.entries()) {
      const previous =
        editingContact && newContactDataArray.length === 1
          ? editingContact
          : undefined;
      const input: Contact = previous
        ? { ...previous, ...data, id: previous.id }
        : applyAutoTags({
            ...data,
            id: requestId ? `${requestId}-${index}` : crypto.randomUUID(),
            addedAt: Date.now(),
            tags: data.tags?.length ? data.tags : ["潜在客户"],
            followUpStatus: "following",
            policies: data.policies || [],
          });
      if (
        contactsRef.current.some(
          (c) => c.id !== input.id && contactKey(c) === contactKey(input),
        )
      )
        throw new Error(
          "同名联系人已存在，请编辑已有联系人；跟进分类可在工作台中添加。",
        );
      const saved = await saveCustomerProfile(input, previous);
      acceptSavedFollowup(saved);
    }
    setEditingContact(null);
  };

  const handleManualAddPolicy = (contactId: string, policy: Policy) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const currentPolicies = [...(c.policies || []), policy];
          const currentTags = new Set(c.tags);
          const currentDealProducts = new Set(c.dealProducts);

          // Auto-tagging based on category
          const category = getPolicyCategory(policy.productName);
          if (category) currentTags.add(category);
          currentDealProducts.add(policy.productName);

          const updatedContact: Contact = {
            ...c,
            policies: currentPolicies,
            tags: Array.from(currentTags),
            dealProducts: Array.from(currentDealProducts),
          };

          return applyAutoTags(updatedContact);
        }
        return c;
      }),
    );
  };

  const handleDeletePolicy = (contactId: string, policyId: string) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const deletedPolicy = (c.policies || []).find(
            (p) => p.id === policyId,
          );
          const updatedPolicies = (c.policies || []).filter(
            (p) => p.id !== policyId,
          );

          // 同步更新 dealProducts - 检查删除的保单产品是否还有其他保单在使用
          const updatedDealProducts = deletedPolicy?.productName
            ? c.dealProducts?.filter((product) => {
                // 如果还有其他保单使用这个产品名称，保留它
                return updatedPolicies.some((p) => p.productName === product);
              })
            : c.dealProducts;

          const updatedContact: Contact = {
            ...c,
            policies: updatedPolicies,
            dealProducts: updatedDealProducts || [],
          };
          return applyAutoTags(updatedContact);
        }
        return c;
      }),
    );
  };

  const handleTableDataSave = (data: ExtractedTableData) => {
    let updatedContacts = [...contacts];
    let newContactsCount = 0;
    let updatedContactsCount = 0;
    let newPoliciesCount = 0;

    const processCustomerItem = (item: any) => {
      if (!item.customerName && !item.idCard) return;

      // 按证件号优先匹配，其次手机号，最后姓名
      const existingIndex = updatedContacts.findIndex(
        (c) =>
          (item.idCard && c.idCard === item.idCard) ||
          (item.phoneNumber && c.phoneNumber === item.phoneNumber) ||
          (item.customerName &&
            (c.remarkName === item.customerName ||
              c.nickname === item.customerName)),
      );

      if (existingIndex >= 0) {
        // 存在则增量更新（保留已有数据，仅补充空字段）
        const existing = updatedContacts[existingIndex];
        updatedContacts[existingIndex] = {
          ...existing,
          phoneNumber: item.phoneNumber || existing.phoneNumber,
          idCard: item.idCard || existing.idCard,
          address: item.address || existing.address,
          bankAccount: item.bankAccount || existing.bankAccount,
        };
        if (item.phoneNumber || item.idCard) {
          updatedContactsCount++;
        }
      } else {
        // 不存在则新增
        updatedContacts.push({
          id: generateId(),
          wxid: "",
          nickname: item.customerName || "",
          remarkName: item.customerName || "未知客户",
          remarkInfo: "Excel表格导入客户",
          tags: ["表格导入"],
          addedAt: Date.now(),
          dealProducts: [],
          intentProducts: [],
          policies: [],
          phoneNumber: item.phoneNumber || "",
          idCard: item.idCard || "",
          address: item.address || "",
          bankAccount: item.bankAccount || "",
        });
        newContactsCount++;
      }
    };

    const processPolicyItem = (item: any) => {
      if (excludedPolicyImport(item.status)) return;
      if (!item.policyNumber && !item.applicantName) return;

      // 按证件号或手机号匹配客户
      let ownerIndex = updatedContacts.findIndex(
        (c) =>
          (item.phoneNumber && c.phoneNumber === item.phoneNumber) ||
          (c.idCard && item.idCard && c.idCard === item.idCard) ||
          c.remarkName === item.applicantName ||
          c.nickname === item.applicantName,
      );

      const newPolicy: Policy = {
        id: generateId(),
        policyNumber: String(item.policyNumber || ""),
        productName: String(item.productName || "未知产品"),
        company: String(item.company || ""),
        premium: String(item.premium || "0"),
        effectiveDate: String(item.effectiveDate || ""),
        status: String(item.status || "有效"),
        applicant: String(item.applicantName || ""),
        insured: String(item.insuredName || ""),
        paymentYears: String(item.paymentYears || ""),
        insuranceType: String(item.insuranceType || ""),
        coverage: String(item.coverage || ""),
      };

      if (ownerIndex >= 0) {
        const contact = updatedContacts[ownerIndex];
        const policies = contact.policies || [];
        // 按保单号去重
        const policyExists = policies.some(
          (p) => p.policyNumber === newPolicy.policyNumber,
        );

        const currentTags = new Set(contact.tags);
        const currentDealProducts = new Set(contact.dealProducts);

        if (newPolicy.productName && newPolicy.productName !== "未知产品") {
          const category = getPolicyCategory(newPolicy.productName);
          if (category) currentTags.add(category);
          currentDealProducts.add(newPolicy.productName);
        }

        if (!policyExists && newPolicy.policyNumber) {
          updatedContacts[ownerIndex] = {
            ...contact,
            policies: [...policies, newPolicy],
            tags: Array.from(currentTags),
            dealProducts: Array.from(currentDealProducts),
          };
          newPoliciesCount++;
        } else if (!policyExists && !newPolicy.policyNumber) {
          // 无保单号但有关联客户，也添加
          updatedContacts[ownerIndex] = {
            ...contact,
            policies: [...policies, newPolicy],
            tags: Array.from(currentTags),
            dealProducts: Array.from(currentDealProducts),
          };
          newPoliciesCount++;
        }
      } else {
        // 未找到对应客户，创建新客户+保单
        const category = getPolicyCategory(item.productName);
        const newTags = [CLOSED_CUSTOMER_TAG];
        if (category) newTags.push(category);

        updatedContacts.push({
          id: generateId(),
          wxid: "",
          nickname: item.applicantName || "未知投保人",
          remarkName: item.applicantName || "未知投保人",
          remarkInfo: "Excel表格导入-保单自动创建",
          tags: newTags,
          addedAt: Date.now(),
          dealProducts:
            item.productName && item.productName !== "未知产品"
              ? [item.productName]
              : [],
          intentProducts: [],
          policies: [newPolicy],
          phoneNumber: item.phoneNumber || "",
          idCard: item.idCard || "",
        });
        newContactsCount++;
        newPoliciesCount++;
      }
    };

    if (data.type === "customer") {
      data.items.forEach(processCustomerItem);
    } else if (data.type === "policy") {
      data.items.forEach(processPolicyItem);
    } else if (data.type === "mixed") {
      data.items.forEach((item) => {
        if (item._rowType === "customer") {
          processCustomerItem(item);
        } else if (item._rowType === "policy") {
          processPolicyItem(item);
        } else {
          if (item.policyNumber) {
            processPolicyItem(item);
          } else if (item.customerName) {
            processCustomerItem(item);
          }
        }
      });
    }

    setContacts(updatedContacts.map(applyAutoTags));
    alert(
      `导入完成！\n新增联系人: ${newContactsCount}\n更新联系人: ${updatedContactsCount}\n新增保单: ${newPoliciesCount}`,
    );
  };

  const acceptSavedFollowup = (contact: Contact) => {
    setContacts((current) => {
      const next = current.some((c) => c.id === contact.id)
        ? current.map((c) => (c.id === contact.id ? contact : c))
        : [contact, ...current];
      skipImportSyncRef.current = next;
      return next;
    });
  };
  const openChatImport = (contactId?: string) => {
    if (contactId) setIsModalOpen(false);
    setChatImport({ contactId, restoreProfile: isModalOpen });
  };
  const closeChatImport = (saved?: Contact) => {
    const original = chatImport?.contactId;
    setChatImport(null);
    if (original && chatImport?.restoreProfile) {
      const contact =
        saved || contactsRef.current.find((item) => item.id === original);
      if (contact) {
        setEditingContact(contact);
        setIsModalOpen(true);
      }
    }
  };
  const saveChatFollowup = async (
    contactId: string,
    writes: import("./services/followupMutation").FollowupWrite[],
  ) => {
    await beforePolicySave();
    const saved = await saveFollowupBundle(contactId, { writes });
    acceptSavedFollowup(saved);
    closeChatImport(saved);
  };
  const completeChatTask = async (
    contactId: string,
    record: ProgressRecord,
  ) => {
    const saved = await saveFollowup(
      contactId,
      "edit",
      { ...record, completed: true },
      record,
    );
    acceptSavedFollowup(saved);
  };
  const handleQuickAddProgress: import("./types").FollowUpSave = async (
    contactId,
    date,
    content,
    newStatus,
    newContactName,
    existingRecordId,
    completed,
    requestId,
    newContactId,
  ) => {
    const existingByName =
      !contactId && newContactName
        ? contactsRef.current.find(
            (c) => contactKey(c) === contactNameKey(newContactName),
          )
        : undefined;
    const id =
      contactId || existingByName?.id || newContactId || crypto.randomUUID();
    const current = contactsRef.current.find((c) => c.id === id);
    const expected = existingRecordId
      ? current?.progressHistory?.find((r) => r.id === existingRecordId)
      : undefined;
    if (existingRecordId && !expected)
      throw new Error("原记录已变化，请刷新后重试。");
    const record: ProgressRecord = {
      ...expected,
      id: existingRecordId || requestId || crypto.randomUUID(),
      date,
      content,
      completed: completed ?? expected?.completed ?? false,
    };
    const newContact: Contact | undefined =
      !current && newContactName
        ? {
            id,
            addedAt: Date.now(),
            wxid: "",
            nickname: newContactName,
            remarkName: newContactName,
            remarkInfo: "快速创建",
            tags: [],
            dealProducts: [],
            intentProducts: [],
            policies: [],
            progressHistory: [],
            followUpStatus: "following",
          }
        : undefined;
    const saved = await saveFollowup(
      id,
      existingRecordId ? "edit" : "add",
      record,
      expected,
      newContact,
    );
    acceptSavedFollowup(saved);
    return saved.id;
  };

  const changeProgress = async (
    contactId: string,
    progressId: string,
    remove: boolean,
  ) => {
    const record = contactsRef.current
      .find((c) => c.id === contactId)
      ?.progressHistory?.find((r) => r.id === progressId);
    if (!record) return;
    try {
      const saved = await saveFollowup(
        contactId,
        remove ? "delete" : "edit",
        remove ? record : { ...record, completed: !record.completed },
        record,
      );
      acceptSavedFollowup(saved);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "跟进记录未保存，请重试。");
    }
  };
  const handleToggleProgress = (contactId: string, progressId: string) => {
    void changeProgress(contactId, progressId, false);
  };
  const handleDeleteProgress = (contactId: string, progressId: string) => {
    void changeProgress(contactId, progressId, true);
  };

  const handleDeleteContact = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "删除联系人",
      message: "确定要删除这位联系人吗？此操作无法撤销。",
      isDestructive: true,
      onConfirm: () => {
        const updatedContacts = contacts.filter((c) => c.id !== id);
        setContacts(updatedContacts);
        localStorage.setItem(
          "wechat-contacts",
          JSON.stringify(updatedContacts),
        );
        localStorage.setItem(
          "wechat-contacts-backup",
          JSON.stringify(updatedContacts),
        );
        if (isSupabaseConfigured() && updatedContacts.length > 0) {
        }
        if (selectedContactIds.has(id)) {
          const newSet = new Set(selectedContactIds);
          newSet.delete(id);
          setSelectedContactIds(newSet);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    setContacts((prev) =>
      prev.map((contact) => ({
        ...contact,
        tags: contact.tags.map((t) => (t === oldTag ? newTag : t)),
      })),
    );
    if (selectedTags.has(oldTag)) {
      const newSet = new Set(selectedTags);
      newSet.delete(oldTag);
      newSet.add(newTag);
      setSelectedTags(newSet);
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setConfirmModal({
      isOpen: true,
      title: "删除标签",
      message: `确定要删除标签 "${tagToDelete}" 吗？此操作将从所有联系人中移除该标签。`,
      isDestructive: true,
      onConfirm: () => {
        setContacts((prev) =>
          prev.map((contact) => ({
            ...contact,
            tags: contact.tags.filter((t) => t !== tagToDelete),
          })),
        );
        if (selectedTags.has(tagToDelete)) {
          const newSet = new Set(selectedTags);
          newSet.delete(tagToDelete);
          setSelectedTags(newSet);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const handleBatchDeleteTags = (tagsToDelete: string[]) => {
    setConfirmModal({
      isOpen: true,
      title: "批量删除标签",
      message: `确定要删除选中的 ${tagsToDelete.length} 个标签吗？此操作将从所有联系人中移除这些标签。`,
      isDestructive: true,
      onConfirm: () => {
        const tagsSet = new Set(tagsToDelete);
        setContacts((prev) =>
          prev.map((contact) => ({
            ...contact,
            tags: contact.tags.filter((t) => !tagsSet.has(t)),
          })),
        );

        setSelectedTags((prev) => {
          const newSet = new Set(prev);
          tagsToDelete.forEach((t) => newSet.delete(t));
          return newSet;
        });

        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const handleRemoveTagFromContact = (contactId: string, tag: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, tags: c.tags.filter((t) => t !== tag) }
          : c,
      ),
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedContactIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedContactIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedContactIds(new Set());
  };

  const handleBatchConfirm = (tags: string[]) => {
    setContacts((prev) =>
      prev.map((contact) => {
        if (selectedContactIds.has(contact.id)) {
          const currentTags = new Set(contact.tags);
          if (batchModalState.mode === "add") {
            tags.forEach((t) => currentTags.add(t));
          } else {
            tags.forEach((t) => currentTags.delete(t));
          }
          return { ...contact, tags: Array.from(currentTags) };
        }
        return contact;
      }),
    );
    handleDeselectAll();
  };

  const handleBatchDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: "批量删除",
      message: `确定要删除选中的 ${selectedContactIds.size} 位联系人吗？此操作无法撤销。`,
      isDestructive: true,
      onConfirm: () => {
        const updatedContacts = contacts.filter(
          (c) => !selectedContactIds.has(c.id),
        );
        setContacts(updatedContacts);
        localStorage.setItem(
          "wechat-contacts",
          JSON.stringify(updatedContacts),
        );
        localStorage.setItem(
          "wechat-contacts-backup",
          JSON.stringify(updatedContacts),
        );
        if (isSupabaseConfigured() && updatedContacts.length > 0) {
        }
        handleDeselectAll();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const handleUpdateStatus = (
    contactId: string,
    newStatus: "idle" | "following",
  ) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const updatedContact = { ...c, followUpStatus: newStatus };
          return applyAutoTags(updatedContact);
        }
        return c;
      }),
    );
  };

  const handleBatchUpdateStatus = (
    ids: string[],
    newStatus: "idle" | "following",
  ) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (ids.includes(c.id)) {
          const updatedContact = { ...c, followUpStatus: newStatus };
          return applyAutoTags(updatedContact);
        }
        return c;
      }),
    );
  };

  const categoryWriteRef = useRef<Promise<void>>(Promise.resolve());
  const updateContactCategory = (
    contactId: string | null,
    name: string | null,
    target: string | null,
    source?: string,
    remove = false,
  ) => {
    const task = categoryWriteRef.current
      .catch(() => {})
      .then(async () => {
        await beforePolicySave();
        acceptSavedFollowup(
          await saveContactCategory(contactId, name, target, source, remove),
        );
      });
    categoryWriteRef.current = task;
    return task;
  };
  const handleRemoveFromFollowUp = (contactId: string, source?: string) =>
    updateContactCategory(contactId, null, null, source, true);
  const handleAddToFollowUp = (contactId: string, target: string) =>
    updateContactCategory(contactId, null, target);
  const handleQuickCreateContact = (name: string, target: string) =>
    updateContactCategory(null, name, target);

  // 类目相关处理函数
  const handleAddCategory = (
    category: Omit<Category, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
      ),
    );
  };

  const handleReorderCategories = (reorderedCategories: Category[]) => {
    const now = Date.now();
    setCategories(
      reorderedCategories.map((category, index) => ({
        ...category,
        order: index,
        updatedAt: now,
      })),
    );
  };

  const handleDeleteCategory = (id: string) => {
    // 删除类目时，将该类目下的联系人移到"无类目"
    setContacts((prev) =>
      prev.map((c) =>
        categoryIds(c).includes(id)
          ? {
              ...c,
              categoryId: undefined,
              categoryIds: categoryIds(c).filter((x) => x !== id),
            }
          : c,
      ),
    );
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMoveContactToCategory = (
    contactId: string,
    target: string | null,
    source?: string,
  ) => updateContactCategory(contactId, null, target, source);

  const filteredByCustomer=contacts.filter(c=>matchesCustomerFilters(c,selectedTags,selectedCategories,categories));
  const deleteTask=async(id:string,task:ProgressRecord)=>{const saved=await saveFollowup(id,"delete",task,task);acceptSavedFollowup(saved);return saved;};
  const renderContent = () => {
    switch (currentView) {
      case "contacts":
        return (
          <ContactList
            contacts={filteredByCustomer}
            hasCategoryFilter={selectedCategories.size>0}
            onEdit={(contact) =>
              setCustomerDetail({ id: contact.id, tab: "profile" })
            }
            onDelete={handleDeleteContact}
            filterTags={selectedTags}
            followUpFilter={followUpFilter}
            selectedIds={selectedContactIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBatchAddTag={() =>
              setBatchModalState({ isOpen: true, mode: "add" })
            }
            onBatchRemoveTag={() =>
              setBatchModalState({ isOpen: true, mode: "remove" })
            }
            onBatchDelete={handleBatchDelete}
            onRemoveTagFromContact={handleRemoveTagFromContact}
            onClearTags={() => {setSelectedTags(new Set());setSelectedCategories(new Set());}}
            onUpdateStatus={handleUpdateStatus}
            onBatchUpdateStatus={handleBatchUpdateStatus}
          />
        );
      case "followups":
        return (
          <FollowupWorkspace
            onDeleteTask={deleteTask}
            onOpenAiSettings={()=>setAiSettingsOpen(true)}
            onOpenCustomer={(c, evidenceId) =>
              setCustomerDetail({ id: c.id, tab: "followup", evidenceId })
            }
            onManageCategories={() => setIsCategoryManagerOpen(true)}
            contacts={filteredByCustomer}
            onImport={openChatImport}
            onEdit={(contact) => {
              setEditingContact(contact);
              setIsModalOpen(true);
            }}
            onSave={async (id, bundle) => {
              await beforePolicySave();
              const saved = await saveFollowupBundle(id, bundle);
              acceptSavedFollowup(saved);
              return saved;
            }}
            renderCategories={(open) => (
              <CategoryBoard
                embedded
                contacts={filteredByCustomer}
                categories={categories}
                filterTags={selectedTags}
                followUpFilter={followUpFilter}
                categoryFilter={categoryFilter}
                onContactClick={open}
                onStatusChange={handleUpdateStatus}
                onContactMove={handleMoveContactToCategory}
                onRemoveFromFollowUp={handleRemoveFromFollowUp}
                onAddToFollowUp={handleAddToFollowUp}
                onQuickCreateContact={handleQuickCreateContact}
                onCategoryFilter={setCategoryFilter}
                onCategoryReorder={handleReorderCategories}
                onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                onImportChat={() => openChatImport()}
                onCompleteChatTask={completeChatTask}
              />
            )}
          />
        );
      case "policies":
        return (
          <RenewalWorkspace
            scopeContactId={policyScopeId}
            onClearScope={() => setPolicyScopeId(null)}
            importFiles={policyImportFiles}
            onImportConsumed={() => setPolicyImportFiles(null)}
            onContacts={acceptSavedPolicyContacts}
            beforeSave={beforePolicySave}
            contacts={contacts}
            visibleCustomerIds={new Set(filteredByCustomer.map(c=>c.id))}
            filterTags={selectedTags}
            followUpFilter={followUpFilter}
            onOpenCustomer={(contact) =>
              setCustomerDetail({ id: contact.id, tab: "policies" })
            }
            onEditContact={(contact) =>
              setCustomerDetail({ id: contact.id, tab: "profile" })
            }
            onAddPolicy={() => setIsManualPolicyOpen(true)}
            onBatchDeleteContacts={(ids) => {
              setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
            }}
            onDeletePolicy={handleDeletePolicy}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white overflow-hidden font-sans">
      <Sidebar
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleAllCategories={ids=>setSelectedCategories(new Set(ids))}
        onSelectCategory={id=>setSelectedCategories(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;})}
        tags={allTags}
        selectedTags={selectedTags}
        onSelectTag={handleToggleTag}
        followUpFilter={followUpFilter}
        onFollowUpFilter={setFollowUpFilter}
        onAddNew={() => {
          setEditingContact(null);
          setIsModalOpen(true);
        }}
        onDeleteTag={handleDeleteTag}
        onRenameTag={handleRenameTag}
        onBatchDeleteTags={handleBatchDeleteTags}
        onToggleAllTags={handleToggleAllTags}
        totalContacts={contacts.length}
        followUpCount={
          contacts.filter((c) => c.followUpStatus === "following").length
        }
        policyCount={
          contacts.filter((c) =>
            c.policies?.some((p) => !excludedPolicyImport(p.status)),
          ).length
        }
        currentView={currentView}
        onChangeView={changeView}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 h-full overflow-hidden relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white border-b border-gray-100 flex items-center px-4 shrink-0 z-20">
          <IconButton
            onClick={() => setIsMobileSidebarOpen(true)}
            className="-ml-2 text-gray-500 hover:text-gray-900"
            aria-label="打开菜单"
          >
            <Menu size={24} />
          </IconButton>
          <span className="ml-2 font-semibold text-gray-900">
            {currentView === "contacts"
              ? `客户管理 (${contacts.length})`
              : currentView === "followups"
                ? `跟进记录 (${contacts.filter((c) => (c.progressHistory && c.progressHistory.length > 0) || c.progress).length})`
                : `保单管理 (${contacts.filter((c) => c.policies && c.policies.length > 0).length})`}
          </span>
        </div>

        <div className="flex-1 h-full overflow-hidden relative">
          {contactsSyncError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 text-sm text-danger-600"
            >
              <span>{contactsSyncError}</span>
              <Button
                className=""
                onClick={() => setContacts([...contactsRef.current])}
                variant="secondary"
                size="sm"
              >
                重试保存
              </Button>
            </div>
          )}
          {renderContent()}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2 shrink-0 z-20 pb-safe">
          <Button
            onClick={() => changeView("contacts")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors ${currentView === "contacts" ? "text-gray-900 bg-gray-100" : "text-gray-400"}`}
            variant="plain"
          >
            <Users size={18} />
            <span className="text-xs font-medium">联系人</span>
          </Button>
          <Button
            onClick={() => changeView("followups")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors ${currentView === "followups" ? "text-gray-900 bg-gray-100" : "text-gray-400"}`}
            variant="plain"
          >
            <ClipboardList size={18} />
            <span className="text-xs font-medium">工作台</span>
          </Button>
          <Button
            onClick={() => changeView("policies")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors ${currentView === "policies" ? "text-gray-900 bg-gray-100" : "text-gray-400"}`}
            variant="plain"
          >
            <FileText size={18} />
            <span className="text-xs font-medium">保单</span>
          </Button>
          <Button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors text-gray-400"
            variant="plain"
          >
            <Menu size={18} />
            <span className="text-xs font-medium">更多</span>
          </Button>
        </div>
      </div>

      {policyContactId && detailPolicyId && (
        <RenewalWorkspace
          contacts={contacts}
          onContacts={acceptSavedPolicyContacts}
          beforeSave={beforePolicySave}
          customerId={policyContactId}
          initialPolicyId={detailPolicyId}
          onCloseDetail={() => {
            setPolicyContactId(null);
            setDetailPolicyId(undefined);
          }}
        />
      )}
      <MingyaImportModal
        open={isMingyaImportOpen}
        initialPayload={mingyaPayload}
        onClose={() => {
          setIsMingyaImportOpen(false);
          setMingyaPayload(null);
        }}
        onLoad={loadMingyaSnapshot}
        onApply={applyMingyaImport}
      />
      {aiSettingsOpen&&<AiSettingsDialog onClose={()=>setAiSettingsOpen(false)} onSaved={()=>window.dispatchEvent(new Event("ai-settings-changed"))}/>}
      {customerDetail && contacts.find((c) => c.id === customerDetail.id) && (
        <CustomerDetailDialog
          key={customerDetail.id}
          contact={contacts.find((c) => c.id === customerDetail.id)!}
          initialTab={customerDetail.tab}
          evidenceId={customerDetail.evidenceId}
          categories={categories}
          onCreateCategory={ensureCategory}
          onClose={() => setCustomerDetail(null)}
          onEdit={() => {
            setEditingContact(
              contacts.find((c) => c.id === customerDetail.id)!,
            );
            setIsModalOpen(true);
          }}
          onImport={() => openChatImport(customerDetail.id)}
          onSave={async (id, bundle) => {
            await beforePolicySave();
            const saved = await saveFollowupBundle(id, bundle);
            acceptSavedFollowup(saved);
            return saved;
          }}
          onMutateHistory={async(kind,record,expected)=>{const saved=await saveFollowup(customerDetail.id,kind,record,expected);acceptSavedFollowup(saved);return saved;}}
          onOpenAiSettings={()=>setAiSettingsOpen(true)}
          onSaveProfile={async(input,expected)=>{
            if(contactsRef.current.some(c=>c.id!==input.id&&contactKey(c)===contactKey(input)))throw Error('同名联系人已存在，请检查备注名。');
            const saved=await saveCustomerProfile(input,expected);acceptSavedFollowup(saved);return saved;
          }}
          renderPolicies={() => (
            <RenewalWorkspace
              embedded
              contacts={contacts}
              scopeContactId={customerDetail.id}
              onContacts={acceptSavedPolicyContacts}
              beforeSave={beforePolicySave}
              onEditContact={() => {
                setEditingContact(
                  contacts.find((c) => c.id === customerDetail.id)!,
                );
                setIsModalOpen(true);
              }}
              onAddPolicy={() => {
                setIsManualPolicyOpen(true);
              }}
            />
          )}
        />
      )}
      <ImportModal
        profileOnly={Boolean(customerDetail)}
        onMingyaImport={() => {
          setIsModalOpen(false);
          setMingyaPayload(null);
          setIsMingyaImportOpen(true);
        }}
        onPolicyImport={(files) => {
          setPolicyImportFiles(files);
          setIsModalOpen(false);
          changeView("policies");
        }}
        onManagePolicies={(id) => {
          setIsModalOpen(false);
          setEditingContact(null);
          setPolicyScopeId(id);
          setSelectedTags(new Set());
          setFollowUpFilter(null);
          setCurrentView("policies");
        }}
        relatedPolicies={
          editingContact
            ? projectContacts(contacts, migrate(contacts), true).find(
                (c) => c.id === editingContact.id,
              )?.policies
            : []
        }
        onPolicyDetail={(p) => {
          if (editingContact) {
            setDetailPolicyId(p.id);
            setPolicyContactId(editingContact.id);
          }
        }}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        onImportChat={openChatImport}
        onPersistFollowup={async (contactId, kind, record, expected) => {
          const saved = await saveFollowup(contactId, kind, record, expected);
          acceptSavedFollowup(saved);
          return saved;
        }}
        onTableSave={handleTableDataSave}
        initialData={editingContact}
        allTags={allTags}
      />

      {chatImport && (
        <ChatFollowUpDialog
          onOpenAiSettings={()=>setAiSettingsOpen(true)}
          contacts={contacts}
          initialContactId={chatImport.contactId}
          onSave={saveChatFollowup}
          onClose={() => closeChatImport()}
        />
      )}

      <BatchTagModal
        isOpen={batchModalState.isOpen}
        mode={batchModalState.mode}
        onClose={() =>
          setBatchModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleBatchConfirm}
        existingTags={allTags}
        selectedCount={selectedContactIds.size}
      />

      <ConfirmModal {...confirmModal} />

      <QuickFollowUpModal
        isOpen={isQuickFollowUpOpen}
        onClose={() => {
          setIsQuickFollowUpOpen(false);
          setEditingRecord(null);
        }}
        contacts={contacts}
        onSave={handleQuickAddProgress}
        initialContactId={quickFollowUpContactId}
        initialRecord={editingRecord?.record}
      />

      <ManualPolicyModal
        initialContactId={customerDetail?.id}
        isOpen={isManualPolicyOpen}
        onClose={() => setIsManualPolicyOpen(false)}
        contacts={contacts}
        onSave={handleManualAddPolicy}
      />

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAdd={handleAddCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
        onReorder={handleReorderCategories}
      />
    </div>
  );
};

export default App;
