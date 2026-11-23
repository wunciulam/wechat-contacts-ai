import Tag,{type TagTone} from './ui/Tag';
import React from 'react';

const tones:Record<string,TagTone>={成交客户:'green',医疗险:'blue',储蓄险:'violet',养老金:'amber',重疾险:'rose'};
export default function CustomerTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1">
    {tags.map(tag => <Tag key={tag} tone={tones[tag]||'neutral'}>{tag}</Tag>)}
  </div>;
}
