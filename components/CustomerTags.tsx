import React from 'react';

const tones: Record<string, string> = {
  成交客户: 'bg-emerald-100 text-emerald-700',
  医疗险: 'bg-blue-100 text-blue-700',
  储蓄险: 'bg-violet-100 text-violet-700',
  养老金: 'bg-amber-100 text-amber-700',
  重疾险: 'bg-rose-100 text-rose-700',
};
export default function CustomerTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1">
    {tags.map(tag => <span key={tag} className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tones[tag] || 'bg-gray-100 text-gray-600'}`}>{tag}</span>)}
  </div>;
}
