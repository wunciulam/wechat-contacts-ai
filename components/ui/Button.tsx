import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "plain";
  size?: "default" | "sm";
  validate?: boolean;
};
const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "secondary",
    size = "default",
    className = "",
    validate,
    onClick,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={`${variant === "plain" ? "ui-action" : `btn btn-${variant} ${size === "sm" ? "btn-sm" : "text-sm"}`} ${className}`}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (validate) {
          const host = e.currentTarget.closest('form,dialog,[role="dialog"]');
          const invalid = (
            Array.from(
              host?.querySelectorAll("input,select,textarea") || [],
            ) as HTMLInputElement[]
          ).find((i) => !i.disabled && !i.checkValidity());
          if (invalid) {
            invalid.reportValidity();
            invalid.focus();
            return;
          }
        }
        onClick?.(e);
      }}
    />
  );
});
export default Button;
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton({ className = "", type = "button", ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={`icon-btn ${className}`}
    />
  );
});
