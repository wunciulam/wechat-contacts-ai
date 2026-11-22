import React from 'react';
export default function PolicyStatus({status}:{status:string}) {
  const colors=/失效|拒保/.test(status)?'bg-rose-100 text-rose-700':/终止|退保|撤单/.test(status)?'bg-gray-100 text-gray-600':/待|核保|明亚状态/.test(status)?'bg-amber-100 text-amber-800':/正式|有效|生效/.test(status)?'bg-emerald-100 text-emerald-800':'bg-gray-100 text-gray-600';
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${colors}`}>{status||'待补充'}</span>;
}
