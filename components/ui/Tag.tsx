import React from "react";
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
}: {
  tone?: TagTone;
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
