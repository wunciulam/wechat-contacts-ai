import React from "react";
import type { Contact } from "../../types";
import Select from "./Select";
export default function ClientPicker({
  contacts,
  value,
  onChange,
  onCreate,
  disabled = false,
  className = "",
  openRequest = 0,
  newName = "",
}: {
  contacts: Contact[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => void;
  disabled?: boolean;
  className?: string;
  openRequest?: number;
  newName?: string;
}) {
  return (
    <Select
      aria-label="关联客户"
      searchable
      openRequest={openRequest}
      className={className}
      value={value}
      onValueChange={onChange}
      onCreate={onCreate}
      disabled={disabled}
    >
      <option value="" disabled>
        {newName ? `新联系人：${newName}` : "选择联系人"}
      </option>
      {contacts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.remarkName || c.nickname}
        </option>
      ))}
    </Select>
  );
}
