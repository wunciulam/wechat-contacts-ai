import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react';
import { PageHeader } from './PageHeader';

const samplePolicies = [
  { name: '安心守护医疗保险', number: 'DEMO-2026-001', applicant: '林女士', insured: '林女士', due: '2026-11-17', amount: 2400, periods: 9, status: '25 天后', tone: 'normal' },
  { name: '长期护理与重大疾病综合保障计划（示例长产品名称，用来检查换行与详情入口是否清楚）', number: 'DEMO-2026-002', applicant: '周先生', insured: '周先生的家属', due: '2026-10-28', amount: 12000, periods: 3, status: '剩余 5 天', tone: 'urgent' },
  { name: '家庭保障计划', number: 'DEMO-2026-003', applicant: '陈女士', insured: '陈女士', due: '待补充', amount: null, periods: null, status: '资料待核对', tone: 'error' },
];

type DemoPolicy = (typeof samplePolicies)[number];
type TagTone = 'neutral' | 'blue' | 'green' | 'amber' | 'violet' | 'rose';
type Shade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
const shadeOrder: Shade[] = ['50','100','200','300','400','500','600','700','800','900'];
const colorScales: Record<TagTone, { name: string; use: string; shades: Record<Shade, string> }> = {
  neutral: { name: '中性灰', use: '页面、文字、边框和主按钮', shades: { '50':'#fafafa','100':'#f5f5f5','200':'#e5e5e5','300':'#d4d4d4','400':'#a3a3a3','500':'#737373','600':'#525252','700':'#404040','800':'#262626','900':'#171717' } },
  blue: { name: '亮蓝', use: '客户阶段', shades: { '50':'#eff6ff','100':'#dbeafe','200':'#bfdbfe','300':'#93c5fd','400':'#60a5fa','500':'#3b82f6','600':'#2563eb','700':'#1d4ed8','800':'#1e40af','900':'#1e3a8a' } },
  green: { name: '翠绿', use: '已成交 / 有效', shades: { '50':'#ecfdf5','100':'#d1fae5','200':'#a7f3d0','300':'#6ee7b7','400':'#34d399','500':'#10b981','600':'#059669','700':'#047857','800':'#065f46','900':'#064e3b' } },
  amber: { name: '明琥珀', use: '待处理提醒', shades: { '50':'#fffbeb','100':'#fef3c7','200':'#fde68a','300':'#fcd34d','400':'#fbbf24','500':'#f59e0b','600':'#d97706','700':'#b45309','800':'#92400e','900':'#78350f' } },
  violet: { name: '亮紫', use: '意向 / 分类', shades: { '50':'#f5f3ff','100':'#ede9fe','200':'#ddd6fe','300':'#c4b5fd','400':'#a78bfa','500':'#8b5cf6','600':'#7c3aed','700':'#6d28d9','800':'#5b21b6','900':'#4c1d95' } },
  rose: { name: '珊瑚红', use: '七天内 / 待核对 / 表单错误', shades: { '50':'#fff1f2','100':'#ffe4e6','200':'#fecdd3','300':'#fda4af','400':'#fb7185','500':'#f43f5e','600':'#e11d48','700':'#be123c','800':'#9f1239','900':'#881337' } },
};
export const paletteVariables = Object.fromEntries((Object.entries(colorScales) as [TagTone, typeof colorScales[TagTone]][]).flatMap(([tone, scale]) => shadeOrder.map(shade => [`--acceptance-${tone}-${shade}`, scale.shades[shade]]))) as React.CSSProperties;
const amountFormatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatAmount = (amount: number | null) => amount === null ? '待补充' : `¥ ${amountFormatter.format(amount)}`;

const sampleTagTones: Record<string, TagTone> = {
  成交客户: 'green', 医疗险: 'blue', 家庭保障: 'violet', 长期护理: 'amber', 资料待核对: 'rose',
};

function Section({ id, title, source, suggestion, children }: { id: string; title: string; source: string; suggestion: string; children: React.ReactNode }) {
  return <section id={id} className="border-t border-gray-100 py-6 sm:py-8 scroll-mt-6">
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <span className="text-xs text-gray-500">参照：{source}</span>
    </div>
    <p className="mb-4 text-xs leading-5 text-gray-500">建议修正：{suggestion}</p>
    {children}
  </section>;
}

function StateLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-xs font-medium text-gray-500">{children}</span>;
}

function AcceptanceTag({ tone = 'neutral', children }: { tone?: TagTone; children: React.ReactNode; key?: React.Key }) {
  return <span className={`acceptance-tag ${tone === 'neutral' ? '' : `acceptance-tag--${tone}`}`}>{children}</span>;
}

function TabsDemo() {
  const [active, setActive] = useState<'overview' | 'policies' | 'empty'>('overview');
  const [filter, setFilter] = useState<'all' | 'due' | 'review'>('all');
  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'policies', label: '保单与缴费（长标题）' },
    { id: 'empty', label: '空状态' },
    { id: 'disabled', label: '暂不可用', disabled: true },
  ] as const;
  const enabledIds = ['overview', 'policies', 'empty'] as const;
  const selectByKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = enabledIds.indexOf(active);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabledIds.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + enabledIds.length) % enabledIds.length;
    setActive(enabledIds[next]);
    document.getElementById(`sample-tab-${enabledIds[next]}`)?.focus();
  };
  return <div className="space-y-5">
    <div>
      <StateLabel>内容切换 Tab：正常、长标题、空状态、禁用</StateLabel>
      <div role="tablist" aria-label="示例内容分页" onKeyDown={selectByKey} className="acceptance-tablist flex max-w-full gap-1 overflow-x-auto border-b border-gray-200 pb-2">
        {tabs.map(tab => <button key={tab.id} id={`sample-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls="sample-tab-panel" tabIndex={active === tab.id ? 0 : -1} disabled={'disabled' in tab} onClick={() => { if (!('disabled' in tab)) setActive(tab.id); }} className="acceptance-tab shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40">{tab.label}</button>)}
      </div>
      <div id="sample-tab-panel" role="tabpanel" aria-labelledby={`sample-tab-${active}`} className="min-h-24 rounded-b-lg border border-t-0 border-gray-200 p-4 text-sm text-gray-700">
        {active === 'overview' && '概览展示当前客户的基本资料与最近记录。'}
        {active === 'policies' && '长标题仍在一行内展示；手机可在 Tab 区域内左右滑动，页面本身不横向溢出。'}
        {active === 'empty' && <span className="text-gray-500">暂无内容。录入后将在此显示。</span>}
      </div>
    </div>
    <div>
      <StateLabel>列表筛选：沿用联系人页面的分段按钮，不与内容 Tab 混用</StateLabel>
      <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-md bg-gray-100 p-1" aria-label="示例列表筛选">
        {([['all','全部'],['due','待续缴'],['review','待核对']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} className={`shrink-0 rounded px-3 py-1.5 text-xs font-medium ${filter === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      <p className="mt-2 text-xs text-gray-500">当前筛选：{({all:'全部',due:'待续缴',review:'待核对'} as const)[filter]}</p>
    </div>
  </div>;
}

function PaletteDemo() {
  return <div className="space-y-5">
    <p className="text-xs leading-5 text-gray-500">页面白色 #ffffff。每个色系下方展示 50–900 共十档；实际标签只用 100 作底、700 作文字，表单错误边框用珊瑚红 500。未列出的颜色不进入样板。</p>
    <div className="grid gap-3 md:grid-cols-2">{(Object.entries(colorScales) as [TagTone, typeof colorScales[TagTone]][]).map(([tone, scale]) => <div key={tone} className="min-w-0 rounded-lg border border-gray-200 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-medium text-gray-900">{scale.name}</div><div className="text-xs text-gray-500">{scale.use}</div></div>{tone !== 'neutral' && <AcceptanceTag tone={tone}>标签示例</AcceptanceTag>}</div>
      <div className="grid grid-cols-10 gap-1">{shadeOrder.map(shade => <div key={shade} className="min-w-0" title={`${scale.name} ${shade}: ${scale.shades[shade]}`}><div className="h-8 rounded-sm border border-gray-100" style={{ backgroundColor: `var(--acceptance-${tone}-${shade})` }} /><div className="mt-1 text-center text-[10px] text-gray-500">{shade}</div></div>)}</div>
      <div className="mt-2 text-xs text-gray-500">100 {scale.shades['100']} · 500 {scale.shades['500']} · 700 {scale.shades['700']}</div>
    </div>)}</div>
  </div>;
}

function TypographyDemo() {
  return <div><p className="mb-3 text-xs text-gray-500">字族沿用原站：Inter / PingFang SC / Microsoft YaHei；标题字重 600，正文 400，按钮及标签 500。</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {[
      { name: '页面标题', size: '18 / 28 px', className: 'text-lg font-semibold', text: '客户保单' },
      { name: '弹窗 / 区块标题', size: '16 / 24 px', className: 'text-base font-semibold', text: '保单详情' },
      { name: '正文 / 按钮', size: '14 / 20 px', className: 'text-sm', text: '下次缴费 2026-11-17' },
      { name: '表头 / 辅助文字', size: '12 / 16 px', className: 'text-xs', text: '待补充资料' },
    ].map(item => <div key={item.name} className="rounded-lg border border-gray-200 p-4"><div className="mb-3 text-xs text-gray-500">{item.name} · {item.size}</div><div className={`${item.className} text-gray-900`}>{item.text}</div></div>)}
  </div></div>;
}

function SpacingDemo() {
  return <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
    <div className="rounded-lg border border-gray-200 p-4"><StateLabel>间距：以 4px 为基础，按内容层级选用</StateLabel><div className="space-y-2">{[4,8,12,16,20,24].map(size => <div className="flex items-center gap-3" key={size}><span className="w-12 text-right text-xs text-gray-500">{size}px</span><div className="h-2 rounded bg-gray-300" style={{ width: size * 5 }} /></div>)}</div></div>
    <div className="rounded-lg border border-gray-200 p-4"><StateLabel>尺寸与圆角：取自现有 btn / input / card / 弹窗</StateLabel><div className="space-y-3 text-xs text-gray-600"><div className="flex items-center gap-3"><button className="btn btn-secondary text-sm">按钮</button><span>高 36px · 圆角 6px</span></div><div className="flex items-center gap-3"><input className="input max-w-32" readOnly value="输入框" /><span>高 38px · 圆角 6px</span></div><div>卡片圆角 8px · 弹窗圆角 12px · 卡片内边距 16px</div></div></div>
  </div>;
}

function SelectDemo() {
  const choices = ['年缴', '月缴', '季缴'];
  const [value, setValue] = useState('年缴');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setHighlighted(choices.indexOf(value)); setOpen(true); return; }
      setHighlighted(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length);
    }
    if (event.key === 'Enter' && open) { event.preventDefault(); setValue(choices[highlighted]); setOpen(false); }
  };
  return <div ref={wrapperRef} className="relative">
    <button type="button" role="combobox" aria-label="缴费方式" aria-haspopup="listbox" aria-expanded={open} aria-controls="sample-payment-options" className="input acceptance-select-trigger flex items-center justify-between text-left" onClick={() => { setHighlighted(choices.indexOf(value)); setOpen(current => !current); }} onKeyDown={onKeyDown}><span>{value}</span><ChevronDown size={16} className="shrink-0 text-gray-500" /></button>
    {open && <div id="sample-payment-options" role="listbox" aria-label="缴费方式选项" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-sm">{choices.map((choice, index) => <button key={choice} type="button" role="option" aria-selected={choice === value} className={`block w-full rounded px-3 py-2 text-left text-sm ${index === highlighted ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`} onMouseEnter={() => setHighlighted(index)} onClick={() => { setValue(choice); setOpen(false); }}>{choice}</button>)}</div>}
  </div>;
}

function NumberDemo() {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {[
      { title: '整数金额', value: formatAmount(2400), note: '2400 → 两位小数' },
      { title: '已有小数', value: formatAmount(12000.5), note: '12000.5 → 补齐两位' },
      { title: '零值', value: formatAmount(0), note: '零不是空值' },
      { title: '缺失值', value: formatAmount(null), note: '缺失不写 0.00' },
    ].map(item => <div key={item.title} className="rounded-lg border border-gray-200 p-4"><StateLabel>{item.title}</StateLabel><div className="text-sm font-medium tabular-nums">{item.value}</div><div className="mt-1 text-xs text-gray-500">{item.note}</div></div>)}
  </div>;
}

function SampleCard({ kind }: { kind: 'normal' | 'long' | 'empty' }) {
  const data = {
    normal: { name: '林女士', note: '已沟通续缴时间，下周电话确认。', tags: ['成交客户', '医疗险'], status: '跟进中' },
    long: { name: '周先生（姓名过长时仍保持卡片宽度和操作位置）', note: '客户希望同时了解父母医疗、家庭意外保障和孩子的教育储备，备注内容较长，用来核对多行文本。', tags: ['成交客户', '家庭保障', '长期护理'], status: '跟进中' },
    empty: { name: '陈女士', note: '', tags: [], status: '暂未跟进' },
  }[kind];
  return <AcceptanceCustomerCard data={data} onOpen={() => alert(data.name + ' · ' + (data.note || '暂无跟进记录'))} />;
}

export function AcceptanceCustomerCard({ data, error, selection, onOpen }: {
  data: { name: string; note: string; tags: string[]; status: string };
  error?: boolean;
  selection?: React.ReactNode;
  onOpen: () => void;
}) {
  return <article className="card relative flex min-h-44 flex-col p-4" aria-label={`${data.name}客户卡片`}>
    {selection && <div className="absolute left-4 top-4">{selection}</div>}
    <div className={selection ? "ml-7 flex flex-1 flex-col" : "flex flex-1 flex-col"}>
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600">{data.name[0]}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-gray-900">{data.name}</h3>
          {data.status === '跟进中' && <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-gray-500"><span className="acceptance-status-dot" aria-hidden="true" />跟进中</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tags.length ? data.tags.map(tag => <AcceptanceTag tone={sampleTagTones[tag] || 'neutral'} key={tag}>{tag}</AcceptanceTag>) : <span className="text-xs text-gray-400">暂无标签</span>}
        </div>
      </div>
    </div>
    <p className={`mt-4 min-h-10 break-words rounded-md p-2 text-xs leading-5 ${error ? 'acceptance-error-note' : 'bg-gray-50 text-gray-600'}`}>{data.note || '暂无跟进记录'}</p>
    <button type="button" className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-gray-700 hover:underline" onClick={onOpen}>查看资料 <ChevronRight size={13} /></button>
    </div>
  </article>;
}

function CurrentWorkbenchCard() {
  return <div className="rounded-lg border border-gray-100 bg-white p-3" aria-label="当前工作台卡片结构示例">
    <div className="flex items-start gap-3 pr-8"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-sm font-bold text-gray-600">林</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-gray-900">林女士</div><div className="mt-0.5 text-[10px] text-gray-500">2026-10-21 更新</div><div className="mt-2 flex gap-1"><span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">成交客户</span><span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">医疗险</span></div></div></div>
    <div className="mt-3 rounded-md border-l-2 border-gray-900 bg-gray-50 p-2"><p className="text-xs font-medium leading-relaxed text-gray-700">已沟通续缴时间，下周电话确认。</p><p className="mt-1 text-[10px] text-gray-400">2026-10-21</p></div>
  </div>;
}

function PolicyTable({ onDetail }: { onDetail: (policy: DemoPolicy) => void }) {
  const [showEmpty, setShowEmpty] = useState(false);
  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-gray-500">包含正常、长内容和资料缺失行；金额与期数保持独立列。<span className="ml-1 sm:hidden">表格可左右滑动。</span></p>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowEmpty(value => !value)}>{showEmpty ? '显示示例保单' : '查看空状态'}</button>
    </div>
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[910px] table-fixed text-left">
        <colgroup><col className="w-[150px]" /><col className="w-[150px]" /><col className="w-[270px]" /><col className="w-[140px]" /><col className="w-[120px]" /><col className="w-[90px]" /><col className="w-[100px]" /></colgroup>
        <thead className="table-header"><tr>
          <th className="px-4 py-3">投保人</th><th className="px-4 py-3">被保人</th><th className="px-4 py-3">保单 / 产品</th><th className="px-4 py-3">下次缴费</th><th className="px-4 py-3 text-right">本期应缴</th><th className="px-4 py-3 text-right">剩余期数</th><th className="px-4 py-3 text-right">操作</th>
        </tr></thead>
        <tbody>
          {showEmpty ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">暂无保单记录。录入保单后会在这里展示。</td></tr> : samplePolicies.map(policy => <tr className="table-row" key={policy.number}>
            <td className="table-cell align-top">{policy.applicant}</td><td className="table-cell align-top">{policy.insured}</td>
            <td className="table-cell align-top"><div className="break-words font-medium text-gray-900">{policy.name}</div><div className="mt-1 text-xs text-gray-500">{policy.number}</div></td>
            <td className="table-cell align-top"><div className="whitespace-nowrap">{policy.due}</div><div className="mt-1"><AcceptanceTag tone={policy.tone === 'normal' ? 'neutral' : 'rose'}>{policy.status}</AcceptanceTag></div></td>
            <td className="table-cell whitespace-nowrap text-right align-top tabular-nums">{formatAmount(policy.amount)}</td><td className="table-cell whitespace-nowrap text-right align-top">{policy.periods === null ? '待补充' : `${policy.periods} 期`}</td>
            <td className="table-cell text-right align-top"><button type="button" className="btn btn-secondary btn-sm" onClick={() => onDetail(policy)}>详情</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

function SampleModal({ policy, onClose }: { policy: DemoPolicy | null; onClose: () => void }) {
  const [name, setName] = useState(policy?.name || '');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [longContent, setLongContent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const lastFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')) as HTMLElement[];
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); lastFocus?.focus(); };
  }, [onClose]);

  const save = () => {
    if (!name.trim()) { setError('请填写保单名称；示例数据只保存在此页面。'); setSaved(false); return; }
    setError(''); setSaved(true);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sample-modal-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><h2 id="sample-modal-title" className="text-base font-semibold text-gray-900">保单详情 · 交互样板</h2><button ref={closeRef} className="icon-btn" aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button></div>
      <div className="min-h-0 space-y-5 overflow-y-auto p-5" data-testid="modal-body">
        <p className="text-xs text-gray-500">仅供组件验收。修改、保存不会写入客户或保单数据库。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-700">保单名称 <span className="acceptance-error-text" aria-label="必填">*</span><input className={`input mt-1.5 ${error ? 'acceptance-error-input' : ''}`} value={name} onChange={event => { setName(event.target.value); setError(''); setSaved(false); }} placeholder="请输入保单名称" aria-invalid={Boolean(error)} /></label>
          <label className="block text-xs font-medium text-gray-700">保单号<input className="input mt-1.5" value={policy?.number || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">投保人<input className="input mt-1.5" value={policy?.applicant || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">被保人<input className="input mt-1.5" value={policy?.insured || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">下次缴费<input className="input mt-1.5" value={policy?.due || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">本期应缴<input className="input mt-1.5" value={policy ? formatAmount(policy.amount) : ''} readOnly /></label>
        </div>
        <label className="block text-xs font-medium text-gray-700">本地备注<textarea className="input mt-1.5 min-h-24 resize-y" value={memo} onChange={event => { setMemo(event.target.value); setSaved(false); }} placeholder="空值状态：尚未填写备注" /></label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLongContent(value => !value)}>{longContent ? '收起长内容' : '展开长内容以检查滚动'}</button>
        {longContent && <div className="space-y-3 rounded-lg border border-gray-200 p-4 text-sm leading-6 text-gray-600">{Array.from({ length: 12 }, (_, index) => <p key={index}>示例记录 {index + 1}：保单资料与缴费记录较多时，只有弹窗正文滚动；标题、关闭和操作栏保持可见。这里不展示真实客户数据。</p>)}</div>}
        {error && <p role="alert" className="acceptance-error-text flex items-center gap-1 text-xs"><AlertCircle size={14} />{error}</p>}
        {saved && <p role="status" className="text-xs text-gray-700">已保存到当前验收页；关闭弹窗后不会保留。</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-4"><button type="button" className="btn btn-secondary text-sm" onClick={onClose}>取消</button><button type="button" className="btn btn-primary text-sm" onClick={save}>保存示例</button></div>
    </div>
  </div>;
}

export function ComponentAcceptancePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<DemoPolicy | null>(null);
  const [query, setQuery] = useState('');
  const [errorValue, setErrorValue] = useState('示例错误值');
  const openModal = (policy: DemoPolicy | null = null) => { setSelectedPolicy(policy); setModalOpen(true); };
  return <div className="acceptance-page min-h-screen bg-white text-gray-900" style={paletteVariables}>
    <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6"><div><div className="text-sm font-semibold">保险跟单仔</div><div className="text-xs text-gray-500">组件验收样板 · 本地示例数据</div></div><div className="flex gap-4"><a className="text-xs text-gray-500 hover:underline" href="/module-acceptance.html">其他模块验收</a><a className="text-xs text-gray-500 hover:underline" href="/">返回当前网站</a></div></div></header>
    <main className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-6">
      <div className="-mx-4 border-b border-gray-100 sm:-mx-6"><PageHeader title="组件验收样板" subtitle="待确认：这不是已定稿的全站规范" actionButton={<button className="btn btn-primary text-sm" onClick={() => openModal()}><Plus size={16} />打开弹窗</button>} searchBox={<div className="relative w-full sm:w-56"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input acceptance-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="演示搜索输入框" aria-label="演示搜索输入框" /></div>} /></div>
      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600"><strong className="font-semibold text-gray-900">怎么反馈：</strong>直接选中不满意的组件并留言，像这次一样说明你想要的效果即可；不用逐项回复验收说明。等你明确说“样板确认”后，才会定稿 design.md 并修改业务页面。本页只用示例数据，不写入线上数据库。</div>
      <nav className="mt-5 flex flex-wrap gap-2 text-xs" aria-label="组件分区">{[['palette','辅助色'],['typography','字号'],['spacing','间距'],['numbers','数字'],['title','页面标题'],['buttons','按钮'],['inputs','输入框'],['tabs','Tab'],['tags','标签'],['cards','客户卡片'],['table','保单表格'],['modal','弹窗']].map(([id,label]) => <a className="btn btn-secondary btn-sm" key={id} href={`#${id}`}>{label}</a>)}</nav>

      <Section id="palette" title="完整色板 · 六个色系" source="原站黑白灰底色与联系人状态标签" suggestion="中性灰沿用原站；五个辅助色各有 50–900 十档。状态文字、边框和标签都从同一色系取值，不混用额外的鲜红色。"><PaletteDemo /></Section>
      <Section id="typography" title="字号层级" source="PageHeader、联系人卡片、新增联系人弹窗" suggestion="以 18 / 16 / 14 / 12px 四级为候选；原站 9–10px 的标签与进展文字提高到 12px。"><TypographyDemo /></Section>
      <Section id="spacing" title="间距与尺寸" source="现有 btn、input、card 与弹窗" suggestion="以 4px 网格组织间距；展示实际控件高、圆角和卡片留白，确认后再决定是否统一公共组件。"><SpacingDemo /></Section>
      <Section id="numbers" title="数字显示规则" source="保单管理的金额列、期数与日期" suggestion="金额等可带小数的数值统一显示两位小数；期数、剩余天数、日期及保单号保持原格式，缺失值不写成零。"><NumberDemo /></Section>

      <Section id="title" title="页面标题" source="全部联系人 / 保单管理的 PageHeader" suggestion="保留标题、计数和右侧动作的排列；手机宽度时动作换行，不缩小字体。"><div className="space-y-3"><div><StateLabel>正常</StateLabel><div className="rounded-lg border border-gray-200"><PageHeader title="客户保单" count={3} subtitle="示例标题与说明" actionButton={<button className="btn btn-secondary text-sm">次要操作</button>} /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="min-w-0"><StateLabel>长标题</StateLabel><div className="rounded-lg border border-gray-200"><PageHeader title="需要核对投保人与被保人关系的长期保障保单" subtitle="长标题允许换行" /></div></div><div className="min-w-0"><StateLabel>无计数 / 禁用动作</StateLabel><div className="rounded-lg border border-gray-200"><PageHeader title="暂无待处理记录" actionButton={<button className="btn btn-secondary text-sm" disabled>暂无可用操作</button>} /></div></div></div></div></Section>
      <Section id="buttons" title="按钮" source="保单管理顶部主次动作 + 新增联系人弹窗" suggestion="主次按钮采用同高；长文案换行或截断，不撑破布局。危险操作只在确有删除意义时用红色。"><div className="grid gap-4 sm:grid-cols-4">{[['正常',<div className="flex flex-wrap gap-2"><button className="btn btn-primary text-sm">保存</button><button className="btn btn-secondary text-sm">取消</button></div>],['长内容',<button className="btn btn-secondary max-w-full text-sm"><span className="truncate">导入并检查这份名称非常长的保单明细文件</span></button>],['空 / 弱动作',<button className="btn btn-ghost text-sm">暂无选择</button>],['禁用',<button className="btn btn-primary text-sm" disabled>资料未填完整</button>]].map(([label,content]) => <div className="min-w-0" key={String(label)}><StateLabel>{label}</StateLabel>{content}</div>)}</div></Section>
      <Section id="inputs" title="输入框" source="新增联系人手动录入表单" suggestion="统一普通输入、下拉和日期的高度；下拉选项采用站内样式并留足箭头边距，错误提示使用色板中的珊瑚红。"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium text-gray-700"><StateLabel>正常</StateLabel><input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="请输入客户姓名" /></label><label className="min-w-0 text-xs font-medium text-gray-700"><StateLabel>长内容</StateLabel><input className="input" defaultValue="家庭医疗与长期保障组合计划（示例长内容）" /></label><label className="text-xs font-medium text-gray-700"><StateLabel>空值</StateLabel><input className="input" placeholder="待补充，不自动填写" /></label><label className="text-xs font-medium text-gray-700"><StateLabel>错误</StateLabel><input className="input acceptance-error-input" value={errorValue} onChange={event => setErrorValue(event.target.value)} aria-invalid="true" /><span className="acceptance-error-text mt-1 block text-xs">请核对输入内容</span></label><label className="text-xs font-medium text-gray-700"><StateLabel>禁用</StateLabel><input className="input" disabled value="暂不可编辑" readOnly /></label><label className="text-xs font-medium text-gray-700"><StateLabel>下拉</StateLabel><SelectDemo /></label></div></Section>
      <Section id="tabs" title="Tab 与列表筛选" source="新增联系人三选项、联系人状态筛选、续期提醒筛选" suggestion="内容切换用一套 Tab；同页列表筛选用分段按钮。长标签可在手机 Tab 区域内滚动，禁用项不可点击。"><TabsDemo /></Section>
      <Section id="tags" title="标签" source="全部联系人卡片的浅灰标签" suggestion="普通、长文案和错误使用同一填充形状；辅助色仅区分种类，待核对和临期仍写清具体含义。"><div className="grid gap-4 sm:grid-cols-4"><div><StateLabel>正常</StateLabel><AcceptanceTag tone="green">成交客户</AcceptanceTag></div><div className="min-w-0"><StateLabel>长内容</StateLabel><AcceptanceTag tone="violet">需要补充投保人与被保人关系说明</AcceptanceTag></div><div><StateLabel>空值</StateLabel><span className="text-xs text-gray-400">暂无标签</span></div><div><StateLabel>错误</StateLabel><AcceptanceTag tone="rose">资料待核对</AcceptanceTag></div></div></Section>
      <Section id="cards" title="客户卡片" source="全部联系人网格卡片 + 当前工作台的 ContactCard" suggestion="上方并排展示现行工作台结构与候选样式，明确二者不同；候选把过小的 9–10px 内容提升到 12px，并允许长备注换行。确认前不替换运行页面。">
        <div className="mb-5 grid gap-3 sm:grid-cols-2"><div><StateLabel>现行跟进工作台结构 · 静态参考</StateLabel><CurrentWorkbenchCard /></div><div><StateLabel>候选客户卡片 · 待确认</StateLabel><SampleCard kind="normal" /></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(['normal','long','empty'] as const).map(kind => <div key={kind} className="min-w-0"><StateLabel>{({normal:'正常',long:'长内容',empty:'空值'} as const)[kind]}</StateLabel><SampleCard kind={kind} /></div>)}</div>
      </Section>
      <Section id="table" title="保单表格" source="保单管理展开后的真实 table" suggestion="保留浅灰表头与轻分割；减少逐字竖排，缺失值写“待补充”，手机只在表格内部横向滚动。"><PolicyTable onDetail={openModal} /></Section>
      <Section id="modal" title="弹窗" source="新增联系人弹窗的遮罩、标题行、双栏表单" suggestion="标题和关闭保持同一行；只滚动正文，底部操作固定。可测试必填错误、长内容滚动、保存和关闭。"><div className="flex flex-wrap gap-2"><button className="btn btn-primary text-sm" onClick={() => openModal()}>打开空值弹窗</button><button className="btn btn-secondary text-sm" onClick={() => openModal(samplePolicies[1])}>打开长保单示例</button></div></Section>
      <p className="border-t border-gray-100 pt-6 text-xs text-gray-400">验收样板 · 所有姓名、保单号、金额与记录均为演示内容</p>
    </main>
    {modalOpen && <SampleModal policy={selectedPolicy} onClose={() => setModalOpen(false)} />}
  </div>;
}
