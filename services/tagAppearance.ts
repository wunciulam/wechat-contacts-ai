import type {TagTone} from '../components/ui/Tag';
const named:Record<string,TagTone>={成交客户:'green',潜在客户:'amber',医疗险:'blue',医疗保障:'blue',储蓄险:'violet',养老金:'amber',重疾险:'rose'};
const palette:TagTone[]=['blue','green','amber','violet','rose'];
export function customerTagTone(label:string):TagTone{
 if(named[label])return named[label];let hash=0;for(const char of label)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;return label?palette[hash%palette.length]:'neutral';
}
export function categoryTagTone(color?:string):TagTone{
 const colors:Record<string,TagTone>={'#ef4444':'rose','#f97316':'amber','#f59e0b':'amber','#84cc16':'green','#10b981':'green','#06b6d4':'blue','#3b82f6':'blue','#8b5cf6':'violet','#ec4899':'rose','#6b7280':'neutral'};return colors[color?.toLowerCase()||'']||'neutral';
}
