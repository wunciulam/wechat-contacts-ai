import React from "react";
import Input, { Textarea } from "./Input";
import Select from "./Select";
export default function Field({
  label,
  children,
  className = "",
  required = false,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  const autoId = React.useId();
  const controls = React.Children.toArray(children);
  const control = controls.find(
    (c) =>
      React.isValidElement(c) &&
      [Input, Textarea, Select].includes(c.type as any),
  ) as React.ReactElement<{ id?: string }> | undefined;
  const id = control?.props.id || autoId;
  return (
    <div className={`ui-field ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-gray-500">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {controls.map((c, i) =>
        React.isValidElement(c) &&
        [Input, Textarea, Select].includes(c.type as any)
          ? React.cloneElement(c as React.ReactElement<{ id?: string }>, {
              id,
              key: c.key || i,
            })
          : c,
      )}
    </div>
  );
}
