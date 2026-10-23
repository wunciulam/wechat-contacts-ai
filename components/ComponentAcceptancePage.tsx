import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronRight, Plus, Search, X } from 'lucide-react';
import { PageHeader } from './PageHeader';

const samplePolicies = [
  { name: '安心守护医疗保险', number: 'DEMO-2026-001', applicant: '林女士', insured: '林女士', due: '2026-11-17', amount: '¥ 2,400.00', periods: '9 期', status: '25 天后', tone: 'normal' },
  { name: '长期护理与重大疾病综合保障计划（示例长产品名称，用来检查换行与详情入口是否清楚）', number: 'DEMO-2026-002', applicant: '周先生', insured: '周先生的家属', due: '2026-10-28', amount: '¥ 12,000.00', periods: '3 期', status: '剩余 5 天', tone: 'urgent' },
  { name: '家庭保障计划', number: 'DEMO-2026-003', applicant: '陈女士', insured: '陈女士', due: '待补充', amount: '待补充', periods: '待补充', status: '资料待核对', tone: 'error' },
];

type DemoPolicy = (typeof samplePolicies)[number];

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

function SampleCard({ kind }: { kind: 'normal' | 'long' | 'empty' | 'error' }) {
  const data = {
    normal: { name: '林女士', note: '已沟通续缴时间，下周电话确认。', tags: ['成交客户', '医疗险'], status: '跟进中' },
    long: { name: '周先生（姓名过长时仍保持卡片宽度和操作位置）', note: '客户希望同时了解父母医疗、家庭意外保障和孩子的教育储备，备注内容较长，用来核对多行文本。', tags: ['成交客户', '家庭保障', '长期护理'], status: '跟进中' },
    empty: { name: '陈女士', note: '', tags: [], status: '暂未跟进' },
    error: { name: '待核对客户', note: '手机号或身份信息缺失，请先核对后再关联保单。', tags: ['资料待核对'], status: '需核对' },
  }[kind];
  return <article className="card flex min-h-44 flex-col p-4" aria-label={`${data.name}客户卡片`}>
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600">{data.name[0]}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-gray-900">{data.name}</h3>
          <span className="shrink-0 text-xs text-gray-500">{data.status}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tags.length ? data.tags.map(tag => <span className="tag" key={tag}>{tag}</span>) : <span className="text-xs text-gray-400">暂无标签</span>}
        </div>
      </div>
    </div>
    <p className={`mt-4 min-h-10 break-words rounded-md bg-gray-50 p-2 text-xs leading-5 ${kind === 'error' ? 'text-red-600' : 'text-gray-600'}`}>{data.note || '暂无跟进记录'}</p>
    <button type="button" className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-gray-700 hover:underline" onClick={() => alert('验收样板：此处不连接真实客户资料。')}>查看示例 <ChevronRight size={13} /></button>
  </article>;
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
            <td className="table-cell align-top"><div className="whitespace-nowrap">{policy.due}</div><div className={`mt-1 text-xs ${policy.tone === 'urgent' || policy.tone === 'error' ? 'text-red-600' : 'text-gray-500'}`}>{policy.status}</div></td>
            <td className="table-cell whitespace-nowrap text-right align-top tabular-nums">{policy.amount}</td><td className="table-cell whitespace-nowrap text-right align-top">{policy.periods}</td>
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
          <label className="block text-xs font-medium text-gray-700">保单名称 *<input className={`input mt-1.5 ${error ? 'border-red-500' : ''}`} value={name} onChange={event => { setName(event.target.value); setError(''); setSaved(false); }} placeholder="请输入保单名称" aria-invalid={Boolean(error)} /></label>
          <label className="block text-xs font-medium text-gray-700">保单号<input className="input mt-1.5" value={policy?.number || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">投保人<input className="input mt-1.5" value={policy?.applicant || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">被保人<input className="input mt-1.5" value={policy?.insured || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">下次缴费<input className="input mt-1.5" value={policy?.due || ''} readOnly /></label>
          <label className="block text-xs font-medium text-gray-700">本期应缴<input className="input mt-1.5" value={policy?.amount || ''} readOnly /></label>
        </div>
        <label className="block text-xs font-medium text-gray-700">本地备注<textarea className="input mt-1.5 min-h-24 resize-y" value={memo} onChange={event => { setMemo(event.target.value); setSaved(false); }} placeholder="空值状态：尚未填写备注" /></label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLongContent(value => !value)}>{longContent ? '收起长内容' : '展开长内容以检查滚动'}</button>
        {longContent && <div className="space-y-3 rounded-lg border border-gray-200 p-4 text-sm leading-6 text-gray-600">{Array.from({ length: 12 }, (_, index) => <p key={index}>示例记录 {index + 1}：保单资料与缴费记录较多时，只有弹窗正文滚动；标题、关闭和操作栏保持可见。这里不展示真实客户数据。</p>)}</div>}
        {error && <p role="alert" className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={14} />{error}</p>}
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
  return <div className="min-h-screen bg-white text-gray-900">
    <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6"><div><div className="text-sm font-semibold">保险跟单仔</div><div className="text-xs text-gray-500">组件验收样板 · 本地示例数据</div></div><a className="text-xs text-gray-500 hover:underline" href="/">返回当前网站</a></div></header>
    <main className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-6">
      <div className="-mx-4 border-b border-gray-100 sm:-mx-6"><PageHeader title="组件验收样板" subtitle="待确认：这不是已定稿的全站规范" actionButton={<button className="btn btn-primary text-sm" onClick={() => openModal()}><Plus size={16} />打开弹窗</button>} searchBox={<div className="relative w-full sm:w-56"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="演示搜索输入框" aria-label="演示搜索输入框" /></div>} /></div>
      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600">此页独立运行，不导入线上数据。左侧概念取自当前客户管理界面；有争议的样式在下方明确标为“建议修正”。请先检查样板，确认后再更新 design.md 和全站组件。</div>
      <nav className="mt-5 flex flex-wrap gap-2 text-xs" aria-label="组件分区">{[['title','页面标题'],['buttons','按钮'],['inputs','输入框'],['tags','标签'],['cards','客户卡片'],['table','保单表格'],['modal','弹窗']].map(([id,label]) => <a className="btn btn-secondary btn-sm" key={id} href={`#${id}`}>{label}</a>)}</nav>

      <Section id="title" title="页面标题" source="全部联系人 / 保单管理的 PageHeader" suggestion="保留标题、计数和右侧动作的排列；手机宽度时动作换行，不缩小字体。"><div className="space-y-3"><div><StateLabel>正常</StateLabel><div className="rounded-lg border border-gray-200"><PageHeader title="客户保单" count={3} subtitle="示例标题与说明" actionButton={<button className="btn btn-secondary text-sm">次要操作</button>} /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="min-w-0"><StateLabel>长标题</StateLabel><div className="rounded-lg border border-gray-200"><PageHeader title="需要核对投保人与被保人关系的长期保障保单" subtitle="长标题允许换行" /></div></div><div className="min-w-0"><StateLabel>无计数 / 禁用动作</StateLabel><div className="rounded-lg border border-gray-200"><PageHeader title="暂无待处理记录" actionButton={<button className="btn btn-secondary text-sm" disabled>暂无可用操作</button>} /></div></div></div></div></Section>
      <Section id="buttons" title="按钮" source="保单管理顶部主次动作 + 新增联系人弹窗" suggestion="主次按钮采用同高；长文案换行或截断，不撑破布局。危险操作只在确有删除意义时用红色。"><div className="grid gap-4 sm:grid-cols-4">{[['正常',<div className="flex flex-wrap gap-2"><button className="btn btn-primary text-sm">保存</button><button className="btn btn-secondary text-sm">取消</button></div>],['长内容',<button className="btn btn-secondary max-w-full text-sm"><span className="truncate">导入并检查这份名称非常长的保单明细文件</span></button>],['空 / 弱动作',<button className="btn btn-ghost text-sm">暂无选择</button>],['禁用',<button className="btn btn-primary text-sm" disabled>资料未填完整</button>]].map(([label,content]) => <div className="min-w-0" key={String(label)}><StateLabel>{label}</StateLabel>{content}</div>)}</div></Section>
      <Section id="inputs" title="输入框" source="新增联系人手动录入表单" suggestion="统一普通输入、下拉和日期的高度；错误只标具体字段并保留已输入内容。"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium text-gray-700"><StateLabel>正常</StateLabel><input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="请输入客户姓名" /></label><label className="min-w-0 text-xs font-medium text-gray-700"><StateLabel>长内容</StateLabel><input className="input" defaultValue="家庭医疗与长期保障组合计划（示例长内容）" /></label><label className="text-xs font-medium text-gray-700"><StateLabel>空值</StateLabel><input className="input" placeholder="待补充，不自动填写" /></label><label className="text-xs font-medium text-gray-700"><StateLabel>错误</StateLabel><input className="input border-red-500" value={errorValue} onChange={event => setErrorValue(event.target.value)} aria-invalid="true" /><span className="mt-1 block text-xs text-red-600">请核对输入内容</span></label><label className="text-xs font-medium text-gray-700"><StateLabel>禁用</StateLabel><input className="input" disabled value="暂不可编辑" readOnly /></label><label className="text-xs font-medium text-gray-700"><StateLabel>下拉</StateLabel><select className="input" defaultValue="annual"><option value="annual">年缴</option><option value="monthly">月缴</option></select></label></div></Section>
      <Section id="tags" title="标签" source="全部联系人卡片的浅灰标签" suggestion="保留黑白灰为基础；错误标签同时写明原因，不只靠颜色。"><div className="grid gap-4 sm:grid-cols-4"><div><StateLabel>正常</StateLabel><span className="tag">成交客户</span></div><div className="min-w-0"><StateLabel>长内容</StateLabel><span className="tag max-w-full break-words">需要补充投保人与被保人关系说明</span></div><div><StateLabel>空值</StateLabel><span className="text-xs text-gray-400">暂无标签</span></div><div><StateLabel>错误</StateLabel><span className="inline-flex rounded border border-red-200 px-2 py-0.5 text-xs text-red-600">资料待核对</span></div></div></Section>
      <Section id="cards" title="客户卡片" source="全部联系人网格卡片 + 跟进工作台记录" suggestion="保留头像、姓名、标签、进展结构；将过小的 9–10px 内容提升为可读的 12px，并让长备注自然换行。"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['normal','long','empty','error'] as const).map(kind => <div key={kind} className="min-w-0"><StateLabel>{({normal:'正常',long:'长内容',empty:'空值',error:'资料待核对'} as const)[kind]}</StateLabel><SampleCard kind={kind} /></div>)}</div></Section>
      <Section id="table" title="保单表格" source="保单管理展开后的真实 table" suggestion="保留浅灰表头与轻分割；减少逐字竖排，缺失值写“待补充”，手机只在表格内部横向滚动。"><PolicyTable onDetail={openModal} /></Section>
      <Section id="modal" title="弹窗" source="新增联系人弹窗的遮罩、标题行、双栏表单" suggestion="标题和关闭保持同一行；只滚动正文，底部操作固定。可测试必填错误、长内容滚动、保存和关闭。"><div className="flex flex-wrap gap-2"><button className="btn btn-primary text-sm" onClick={() => openModal()}>打开空值弹窗</button><button className="btn btn-secondary text-sm" onClick={() => openModal(samplePolicies[1])}>打开长保单示例</button></div></Section>
      <p className="border-t border-gray-100 pt-6 text-xs text-gray-400">验收样板 · 所有姓名、保单号、金额与记录均为演示内容</p>
    </main>
    {modalOpen && <SampleModal policy={selectedPolicy} onClose={() => setModalOpen(false)} />}
  </div>;
}
