import {customerTagTone} from '../services/tagAppearance';
import Tag,{type TagTone} from './ui/Tag';
import React from 'react';


export default function CustomerTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1">
    {tags.map(tag => <Tag key={tag} tone={customerTagTone(tag)}>{tag}</Tag>)}
  </div>;
}
