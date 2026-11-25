import React from "react";
import { Search } from "lucide-react";
import DateInput from "./DateInput";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ElementType;
  appearance?: "default" | "embedded" | "date-icon";
};
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon: Icon, appearance="default", className = "", type = "text", ...props },
  ref,
) {
  if (type === "date")
    return <DateInput {...props} iconOnly={appearance === "date-icon"} className={className} ref={ref} />;
  if (Icon)
    return (
      <span
        className={`ui-input-shell ${className}`}
        data-disabled={props.disabled || undefined}
      >
        <Icon size={16} aria-hidden="true" />
        <input {...props} ref={ref} type={type} className="ui-input-content" />
      </span>
    );
  return (
    <input {...props} ref={ref} type={type} className={`${appearance==="embedded"?"ui-input-embedded":"input"} ${className}`} />
  );
});
export default Input;
export const SearchInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, "leadingIcon">
>(function SearchInput(
  { placeholder = "搜索…", "aria-label": label, ...props },
  ref,
) {
  return (
    <Input
      {...props}
      ref={ref}
      type="search"
      placeholder={placeholder}
      aria-label={label || String(placeholder).replace(/[…\.]+$/, "")}
      leadingIcon={Search}
    />
  );
});
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return <textarea {...props} ref={ref} className={`input ${className}`} />;
});
