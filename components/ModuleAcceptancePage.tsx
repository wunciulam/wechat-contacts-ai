import React, { useState } from 'react';
import { ChevronDown, X, Search, Plus, List, LayoutGrid, Settings, Bell, Upload, Tags } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { AcceptanceCustomerCard, paletteVariables } from './ComponentAcceptancePage';

type Area = 'contacts' | 'board' | 'policies';
type Person = { id: number; name: string; stage: string; note: string; column: string; tags: string[] };
const initialPeople: Person[] = [
  { id: 1, tags: ['成交客户','医疗险'], name: '林女士', stage: '跟进中', note: '已沟通续缴时间，下周电话确认。', column: '本周跟进' },
  { id: 2, tags: ['成交客户','家庭保障','长期护理'], name: '周先生（长姓名示例）', stage: '跟进中', note: '希望了解家庭医疗、重大疾病与长期护理保障，备注用于检查多行内容。', column: '本周跟进' },
  { id: 3, tags: [], name: '陈女士', stage: '暂未跟进', note: '', column: '待联系' },
];
const policies = [
  { number: 'DEMO-001', name: '安心守护医疗保险', applicant: '林女士', insured: '林女士', due: '2026-11-08', amount: '¥ 2,400.00', periods: '9 期', days: '剩余 5 天' },
  { number: 'DEMO-002', name: '长期护理与重大疾病综合保障计划', applicant: '周先生', insured: '周先生的家属', due: '2026-11-28', amount: '¥ 12,000.00', periods: '3 期', days: '剩余 25 天' },
];
const tag = (text: string, tone = 'blue') => <span className={`acceptance-tag acceptance-tag--${tone}`}>{text}</span>;
function CustomerCheckbox({ name, checked, onChange }: { name: string; checked: boolean; onChange: () => void }) {
  return <input type="checkbox" aria-label={`选择${name}`} checked={checked} onChange={onChange}
    className="h-4 w-4 cursor-pointer accent-gray-900" />;
}

function Dialog({ title, onClose, children, action }: { title: string; action?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="text-base font-semibold">{title}</h2><div className="ml-auto mr-2">{action}</div><button className="icon-btn" aria-label="关闭" onClick={onClose}><X size={20}/></button></div><div className="min-h-0 overflow-y-auto p-5">{children}</div><div className="flex shrink-0 justify-end border-t border-gray-100 px-5 py-4"><button className="btn btn-secondary" onClick={onClose}>关闭</button></div></div></div>;
}
export function ModuleAcceptancePage() {
  const [area, setArea] = useState<Area>('contacts');
  const [people, setPeople] = useState(initialPeople);
  const [query, setQuery] = useState('');
  const [list, setList] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number[]>([1]);
  const [dialog, setDialog] = useState('');
  const [columns, setColumns] = useState(['待联系','本周跟进','已沟通']);
  const [movingColumn, setMovingColumn] = useState('');
  const [dragged, setDragged] = useState<number | null>(null);
  const [paid, setPaid] = useState<string[]>([]);
  const visible = people.filter(p => p.name.includes(query));
  const toggleSelected = (id: number) => setSelected(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const move = (id: number, column: string) => setPeople(v => v.map(p => p.id === id ? { ...p, column } : p));
  return <div className="acceptance-page min-h-screen bg-white text-gray-900" style={paletteVariables}>
    <header className="border-b border-gray-100 px-5 py-3 text-sm font-semibold">保险跟单仔 <span className="ml-2 text-xs font-normal text-gray-500">其他模块 · 本地验收</span><a href="/ui-acceptance.html" className="float-right text-xs font-normal text-gray-500 hover:underline">基础组件样板</a></header>
    <main className="mx-auto max-w-[1304px] pb-20">
      <div className="border-b border-gray-100"><PageHeader title="模块组件验收" subtitle="只使用示例数据；直接点选不满意的位置留言" /></div>
      <nav className="flex gap-2 overflow-x-auto border-b border-gray-100 p-4" aria-label="模块">{([['contacts','联系人管理'],['board','跟进工作台'],['policies','保单管理']] as const).map(([id,label]) => <button key={id} onClick={() => setArea(id)} className={`btn whitespace-nowrap text-sm ${area === id ? 'btn-primary' : 'btn-secondary'}`}>{label}</button>)}</nav>
      {area === 'contacts' && <section className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="mr-auto text-base font-semibold">全部联系人 <span className="text-xs font-normal text-gray-500">共 {visible.length}</span></h2><button className="btn btn-secondary btn-sm" onClick={() => setList(v => !v)}>{list ? <LayoutGrid size={14} aria-hidden/> : <List size={14} aria-hidden/>}{list ? '卡片视图' : '列表视图'}</button><div className="relative"><Search size={15} className="absolute left-3 top-3 text-gray-400"/><input className="input !pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索联系人"/></div></div>
        {visible.length === 0 ? <div className="rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-500">没有匹配的联系人 <button className="ml-2 underline" onClick={() => setQuery('')}>清除搜索</button></div> : list ? <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full min-w-[640px] text-sm"><thead className="table-header"><tr>{['选择','联系人','最新进展','跟进状态','操作'].map(x=><th className="table-cell text-left" key={x}>{x}</th>)}</tr></thead><tbody>{visible.map(p=><tr className="table-row" key={p.id}><td className="table-cell"><CustomerCheckbox name={p.name} checked={selected.includes(p.id)} onChange={()=>toggleSelected(p.id)}/></td><td className="table-cell font-medium">{p.name}</td><td className="table-cell">{p.note || '无记录'}</td><td className="table-cell">{p.stage === '跟进中' ? tag('跟进中') : '—'}</td><td className="table-cell"><button className="btn btn-secondary btn-sm" onClick={()=>setDialog(p.name)}>详情</button></td></tr>)}</tbody></table></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(p=><div key={p.id}><AcceptanceCustomerCard
          data={{ name: p.name, status: p.stage, note: p.note, tags: p.tags }}
          selection={<CustomerCheckbox name={p.name} checked={selected.includes(p.id)} onChange={()=>toggleSelected(p.id)} />}
          onOpen={()=>setDialog(p.name)} /></div>)}</div>}
        {selected.length > 0 && <div className="fixed bottom-4 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"><span className="px-2 text-xs font-medium text-[var(--acceptance-blue-700)]">{selected.length} 位客户</span><button className="btn btn-secondary btn-sm" onClick={()=>setDialog('批量修改标签')}><Tags size={14} aria-hidden/>修改标签</button><button className="btn btn-ghost btn-sm" onClick={()=>setSelected([])}>取消选择</button></div>}
      </section>}
      {area === 'board' && <section className="p-4 md:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">跟进工作台</h2><button className="btn btn-secondary text-sm" onClick={()=>setDialog('分类管理')}><Settings size={14} aria-hidden/>管理分类</button></div><p className="mb-4 text-xs text-gray-500">拖动列标题调整分类顺序，拖动卡片排序或更改分类。</p><div className="flex gap-4 overflow-x-auto pb-4">{columns.map(column=><div key={column} className="min-h-[420px] w-72 shrink-0 rounded-xl bg-gray-50" onDragOver={e=>e.preventDefault()} onDrop={()=>{if (movingColumn) {
          setColumns(order => {
            const next = order.filter(item => item !== movingColumn);
            next.splice(order.indexOf(column), 0, movingColumn);
            return next;
          });
          setMovingColumn('');
        } else if(dragged !== null) move(dragged,column);setDragged(null);}}><div className="flex items-center justify-between border-b border-gray-100 p-3"><h3 draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",column);setMovingColumn(column)}} onDragEnd={()=>setMovingColumn("")} className="flex-1 cursor-grab text-sm font-semibold">{column} <span className="text-xs text-gray-500">{people.filter(p=>p.column===column).length}</span></h3><button className="icon-btn" aria-label={`添加到${column}`} onClick={()=>setDialog(`添加联系人到${column}`)}><Plus size={16}/></button></div><div className="space-y-2 p-2">{people.filter(p=>p.column===column).map(p=><article draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",String(p.id));setDragged(p.id)}} onDragEnd={()=>setDragged(null)}
          onDrop={e=>{
            if (dragged === null) return;
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            if (dragged !== p.id) setPeople(items=>{
              const source = items.find(item=>item.id===dragged);
              if (!source) return items;
              const next = items.filter(item=>item.id!==dragged);
              const index = next.findIndex(item=>item.id===p.id);
              next.splice(index + Number(e.clientY > rect.top + rect.height / 2), 0, {...source,column});
              return next;
            });
            setDragged(null);
          }} className="cursor-grab rounded-lg border border-gray-100 bg-white p-3" key={p.id}><div className="text-sm font-semibold">{p.name}</div><div className="mt-2 flex gap-1">{tag('成交客户','green')}{tag('医疗险')}</div><p className="mt-3 border-l-2 border-gray-900 bg-gray-50 p-2 text-xs leading-5">{p.note || '暂无跟进记录'}</p></article>)}{!people.some(p=>p.column===column)&&<div className="py-12 text-center text-xs text-gray-400">暂无联系人 · 可拖入此列</div>}</div></div>)}</div></section>}
      {area === 'policies' && <section className="p-4 md:p-6"><div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="mr-auto text-base font-semibold">客户保单 <span className="text-xs font-normal text-gray-500">共 2 位客户</span></h2><button className="btn btn-secondary text-sm" onClick={()=>setDialog('导入预览')}><Upload size={14} aria-hidden/>导入明亚表格</button><button className="btn btn-secondary text-sm" onClick={()=>setDialog('续期提醒')}><Bell size={14} aria-hidden/>续期提醒（1）</button><button className="btn btn-primary text-sm" onClick={()=>setDialog('录入保单')}><Plus size={14} aria-hidden/>录入保单</button></div><div className="space-y-3">{[1,2].map((id,index)=><div key={id} className="overflow-hidden rounded-lg border border-gray-200"><button className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50" onClick={()=>setExpanded(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">{index===0?'林':'周'}</span><span className="flex-1"><strong className="text-sm">{index===0?'林女士':'周先生'}</strong><span className="ml-2 text-xs text-gray-500">1 份保单</span></span><span className="text-sm tabular-nums">{policies[index].amount}</span><ChevronDown size={18} className={expanded.includes(id)?'rotate-180':''}/></button>{expanded.includes(id)&&<div className="overflow-x-auto border-t border-gray-100 bg-gray-50 p-3"><table className="w-full min-w-[780px] bg-white text-sm"><thead className="table-header"><tr>{['保单 / 产品','投保人 / 被保人','下次缴费','本期应缴','剩余期数','操作'].map(x=><th key={x} className="table-cell text-left">{x}</th>)}</tr></thead><tbody><tr className="table-row"><td className="table-cell">{policies[index].name}<div className="text-xs text-gray-500">{policies[index].number}</div></td><td className="table-cell">{policies[index].applicant} / {policies[index].insured}</td><td className="table-cell">{policies[index].due}<div className="mt-1">{tag(policies[index].days,index===0?'rose':'neutral')}</div></td><td className="table-cell">{policies[index].amount}</td><td className="table-cell">{policies[index].periods}</td><td className="table-cell"><button className="btn btn-secondary btn-sm" onClick={()=>setDialog(policies[index].number)}>详情</button></td></tr></tbody></table></div>}</div>)}</div></section>}
    </main>
    {dialog && <Dialog title={dialog} action={dialog === '续期提醒' && <button className="btn btn-secondary btn-sm" onClick={()=>setDialog('通知设置')}><Settings size={14} aria-hidden/>通知设置</button>} onClose={()=>setDialog('')}>{dialog === '导入预览' ? <div className="space-y-4 text-sm"><p>示例预览：原始 3 条 · 合并后 2 份保单 · 撤单 1 条。尚未保存线上。</p><div className="rounded-lg border border-gray-200 p-3">DEMO-001 · 林女士 · 下次缴费 2026-11-08 · ¥ 2,400.00</div><button className="btn btn-primary" onClick={()=>setDialog('导入示例已核对')}>确认示例</button></div> : dialog === '续期提醒' ? <div className="space-y-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
      <dl className="grid min-w-[min(100%,14rem)] flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {[['投保人',policies[0].applicant],['产品',policies[0].name],['下次缴费',policies[0].due],['本期应缴',policies[0].amount]].map(([label,value])=><div key={label}><dt className="text-xs text-gray-500">{label}</dt><dd className="flex items-center gap-2"><span>{value}</span>{label === '下次缴费' && (paid.length ? tag('本期已缴','green') : tag(policies[0].days,'rose'))}</dd></div>)}

      </dl><button className="btn btn-secondary btn-sm ml-auto" onClick={()=>setPaid(v=>v.includes('DEMO-001')?[]:['DEMO-001'])}>{paid.includes('DEMO-001')?'改为未缴':'标记本期已缴'}</button></div></div> : dialog === '通知设置' ? <div className="grid gap-4 text-xs sm:grid-cols-2"><label>收件邮箱<input className="input mt-1.5" defaultValue="lamwunciu@qq.com"/></label><label>发送时间（北京时间）<input className="input mt-1.5" type="time" defaultValue="09:00"/></label><p className="sm:col-span-2 text-gray-500">这里只展示控件，保存不会配置真实发信服务。</p></div> : dialog.startsWith('DEMO-') ? <div className="grid gap-4 text-xs sm:grid-cols-2">{[['保单号',dialog],['缴费方式','年缴'],['缴费期间','10 年'],['保障期间','终身'],['下次缴费',policies.find(p=>p.number===dialog)?.due||'待补充'],['本期应缴',policies.find(p=>p.number===dialog)?.amount||'待补充']].map(([label,value])=><label key={label}>{label}<input className="input mt-1.5" defaultValue={value}/></label>)}<div className="sm:col-span-2 rounded-lg border border-gray-200 p-3">缴费历史：2025-11-08 · ¥ 2,400.00 · 已缴费</div></div> : <div className="space-y-4 text-sm"><p>此处为 {dialog} 的本地交互示例，不会读写线上数据。</p><input className="input" placeholder="输入示例内容"/><button className="btn btn-primary" onClick={()=>setDialog('示例已保存')}>保存示例</button></div>}</Dialog>}
  </div>;
}
