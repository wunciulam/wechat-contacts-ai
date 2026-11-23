import { SearchInput } from "./Input";
import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { useControlPopover } from "./useControlPopover";

type Props = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "multiple" | "size"
> & {
  onValueChange?: (value: string) => void;
  searchable?: boolean;
  onCreate?: (name: string) => void;
  openRequest?: number;
};
type Option = { value: string; label: React.ReactNode; disabled: boolean };
function optionsFrom(children: React.ReactNode): Option[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (
      !React.isValidElement<{
        value?: unknown;
        disabled?: boolean;
        children?: React.ReactNode;
      }>(child)
    )
      return [];
    if (child.type === React.Fragment) return optionsFrom(child.props.children);
    if (child.type !== "option") return [];
    return [
      {
        value: String(child.props.value ?? child.props.children ?? ""),
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
      },
    ];
  });
}
export default function Select({
  value,
  defaultValue,
  children,
  onValueChange,
  disabled,
  className = "",
  id,
  name,
  required,
  searchable = false,
  onCreate,
  openRequest = 0,
  ...props
}: Props) {
  const allOptions = optionsFrom(children);
  const [query, setQuery] = React.useState("");
  const options = allOptions.filter(
    (x) =>
      !searchable ||
      String(x.label).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const [local, setLocal] = React.useState(
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const selected = String(value ?? local),
    [open, setOpen] = React.useState(false),
    [active, setActive] = React.useState(0);
  const trigger = React.useRef<HTMLButtonElement>(null),
    panel = React.useRef<HTMLDivElement>(null),
    listId = React.useId();
  const current = allOptions.find((x) => x.value === selected);
  const label =
    props["aria-label"] ||
    trigger.current?.labels?.[0]?.textContent?.replace(/\*/g, "").trim() ||
    name ||
    "选项";
  useControlPopover(open, () => setOpen(false), trigger, panel);
  React.useEffect(() => {
    if (open)
      panel.current
        ?.querySelector<HTMLElement>('[data-active="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  React.useEffect(() => {
    if (open && searchable) {
      const frame = requestAnimationFrame(() =>
        panel.current?.querySelector<HTMLInputElement>("input")?.focus(),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [open, searchable]);
  React.useEffect(() => {
    if (openRequest && !disabled) {
      setQuery("");
      setOpen(true);
    }
  }, [openRequest]);
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    setLocal(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    trigger.current?.focus();
  };
  const move = (step: number) => {
    let n = active;
    for (let i = 0; i < options.length; i++) {
      n = (n + step + options.length) % options.length;
      if (!options[n].disabled) {
        setActive(n);
        return;
      }
    }
  };
  const keydown = (e: React.KeyboardEvent) => {
    if (
      (e.target as HTMLElement).tagName === "INPUT" &&
      ["Home", "End"].includes(e.key)
    )
      return;
    if (e.key === " " && (e.target as HTMLElement).tagName === "INPUT") return;
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (!open) {
        setQuery("");
        setActive(
          Math.max(
            0,
            allOptions.findIndex((x) => x.value === selected),
          ),
        );
        setOpen(true);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp")
        move(e.key === "ArrowDown" ? 1 : -1);
      else if (e.key === "Home")
        setActive(
          Math.max(
            0,
            options.findIndex((x) => !x.disabled),
          ),
        );
      else if (e.key === "End")
        setActive(options.map((x) => !x.disabled).lastIndexOf(true));
      else if (options.length) choose(active);
      else if (onCreate && query.trim()) {
        onCreate(query.trim());
        setOpen(false);
      }
    } else if (e.key.length === 1) {
      const index = options.findIndex(
        (x) =>
          !x.disabled &&
          String(x.label).toLowerCase().startsWith(e.key.toLowerCase()),
      );
      if (index >= 0) setActive(index);
    }
  };
  return (
    <div className={`ui-select ${className}`}>
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        id={id}
        ref={trigger}
        role="combobox"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        aria-invalid={props["aria-invalid"]}
        aria-required={required}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={
          open && options.length ? `${listId}-${active}` : undefined
        }
        disabled={disabled}
        className="input ui-select-trigger"
        onKeyDown={keydown}
        onClick={() => {
          setActive(
            Math.max(
              0,
              allOptions.findIndex((x) => x.value === selected),
            ),
          );
          setQuery("");
          setOpen(!open);
        }}
      >
        <span>{current?.label ?? selected ?? "请选择"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          popover="auto"
          data-ui-popover
          ref={panel}
          role={searchable ? undefined : "listbox"}
          id={searchable ? `${listId}-panel` : listId}
          aria-label={searchable ? undefined : `${label}选项`}
          className="ui-popover ui-select-options"
          onKeyDown={keydown}
        >
          {searchable && (
            <div className="ui-select-search">
              <SearchInput
                autoFocus
                placeholder="搜索联系人…"
                aria-label="搜索选项"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                aria-controls={listId}
                aria-activedescendant={
                  options.length ? `${listId}-${active}` : undefined
                }
              />
            </div>
          )}
          <div
            id={searchable ? listId : undefined}
            role={searchable ? "listbox" : undefined}
            aria-label={searchable ? `${label}选项` : undefined}
            className="ui-select-list"
          >
            {options.map((option, i) => (
              <button
                type="button"
                key={`${option.value}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected === option.value}
                disabled={option.disabled}
                data-active={i === active}
                tabIndex={-1}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
                className="ui-select-option"
              >
                <span>{option.label}</span>
                {selected === option.value && (
                  <Check size={16} aria-hidden="true" />
                )}
              </button>
            ))}
            {!options.length && (
              <p className="px-3 py-2 text-xs text-gray-500">
                没有匹配的联系人
              </p>
            )}
          </div>
          {onCreate &&
            query.trim() &&
            !allOptions.some(
              (x) =>
                String(x.label).replace(/\s/g, "") === query.replace(/\s/g, ""),
            ) && (
              <button
                type="button"
                className="ui-select-create"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") e.stopPropagation();
                }}
                onClick={() => {
                  onCreate(query.trim());
                  setOpen(false);
                }}
              >
                添加“{query.trim()}”
              </button>
            )}
        </div>
      )}
    </div>
  );
}
