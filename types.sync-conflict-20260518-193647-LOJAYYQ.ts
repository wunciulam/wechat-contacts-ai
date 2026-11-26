
export interface ProgressRecord {
  id: string;
  date: string;
  content: string;
  completed?: boolean;
}

export interface Policy {
  id: string;
  policyNumber: string;
  productName: string;
  company: string;
  premium: string;
  effectiveDate: string;
  status: string;
  applicant: string;
  insured: string;
  paymentYears?: string;
  insuranceType?: string;
  coverage?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  wxid: string;
  nickname: string;
  remarkName: string;
  remarkInfo: string;
  tags: string[];
  avatarUrl?: string;
  addedAt: number;

  phoneNumber?: string;
  idCard?: string;
  address?: string;
  bankAccount?: string;
  birthday?: string;

  lastDate?: string;
  progressHistory?: ProgressRecord[];
  progress?: string;

  dealProducts: string[];
  intentProducts: string[];

  policies?: Policy[];

  followUpStatus?: 'idle' | 'following';
  categoryId?: string;
}

// 跟进状态标签映射
export const FOLLOW_UP_STATUS_LABELS: Record<NonNullable<Contact['followUpStatus']>, string> = {
  idle: '暂未跟进',
  following: '跟进中'
};

export type NewContact = Omit<Contact, 'id' | 'addedAt'>;

export interface ExtractedData {
  wxid?: string;
  nickname?: string;
  remarkName?: string;
  remarkInfo?: string;
  tags?: string[]; 
  lastDate?: string;
  progress?: string;
  dealProducts?: string[];
  intentProducts?: string[];
}

export interface ExtractedTableData {
  type: 'customer' | 'policy' | 'mixed';
  items: any[];
}

export interface ExcelCustomerRow {
  序号?: number;
  '客户姓名'?: string;
  '证件号'?: string;
  '出生日期'?: string;
  '手机号'?: string;
  '地址'?: string;
  '银行账号'?: string;
  '保单数量'?: number;
  '首期保费合计'?: number;
}

export interface ExcelPolicyRow {
  '险种管理部门'?: string;
  '产品名称'?: string;
  '生效日期'?: string;
  '投保人姓名'?: string;
  '被保人'?: string;
  '保单状态'?: string;
  '保费'?: string;
  '保险公司'?: string;
  '保单号'?: string;
  '投保单号'?: string;
  '分拣号'?: string;
  '产品编码'?: string;
  '交单日期'?: string;
  '回执日期'?: string;
  '回执操作方式'?: string;
  '手机号'?: string;
  '有无照会记录'?: string;
  '有无委托协议号'?: string;
  '保费过期未付后续处理方式'?: string;
  '缴费年限'?: string;
  '险种类型'?: string;
  '保额'?: string;
}
