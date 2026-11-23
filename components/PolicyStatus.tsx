import Tag from './ui/Tag';
import React from 'react';
export default function PolicyStatus({status}:{status:string}) {
  const tone=/失效|拒保/.test(status)?'rose':/终止|退保|撤单/.test(status)?'neutral':/待|核保|明亚状态/.test(status)?'amber':/正式|有效|生效/.test(status)?'green':'neutral';
  return <Tag tone={tone}>{status||'待补充'}</Tag>;
}
