import React from "react";
import { X } from "lucide-react";
import { IconButton } from "./Button";
const tones = {
  neutral: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  rose: "bg-rose-100 text-rose-700",
};
export type TagTone = keyof typeof tones;
export default function Tag({
  tone = "neutral",
  children,
  className = "",
  onRemove,
  removeLabel,
}: {
  tone?: TagTone;
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
  onRemove?:()=>void;
  removeLabel?:string;
}) {
  return (
    <span
      className={`inline-flex items-center self-center shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
      {onRemove&&<IconButton className="ui-tag-remove" aria-label={removeLabel||`移除${String(children)}`} onClick={e=>{e.stopPropagation();onRemove();}}><X size={12}/></IconButton>}
    </span>
  );
}
