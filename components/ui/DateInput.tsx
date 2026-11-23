import React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useControlPopover } from "./useControlPopover";
const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const parse = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s + "T00:00:00Z")) &&
  iso(new Date(s + "T00:00:00Z")) === s
    ? new Date(s + "T00:00:00Z")
    : undefined;
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(
    new Date(),
  );
const offset = (s: string, days: number) => {
  const d = parse(s)!;
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
};
const DateInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function DateInput(
  {
    value,
    defaultValue,
    onChange,
    className = "",
    min,
    max,
    disabled,
    readOnly,
    id,
    required,
    onBlur,
    ...props
  },
  forwarded,
) {
  const [local, setLocal] = React.useState(String(defaultValue || "")),
    [open, setOpen] = React.useState(false),
    [month, setMonth] = React.useState(() => {
      const d = parse(String(value || defaultValue || "")) || parse(today())!;
      return [d.getUTCFullYear(), d.getUTCMonth()] as [number, number];
    }),
    [active, setActive] = React.useState(
      String(value || defaultValue || today()),
    ),
    [monthView, setMonthView] = React.useState(false),
    [yearDraft, setYearDraft] = React.useState(""),
    [touched, setTouched] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null),
    anchor = React.useRef<HTMLSpanElement>(null),
    panel = React.useRef<HTMLDivElement>(null),
    calendarId = React.useId();
  React.useImperativeHandle(forwarded, () => input.current!);
  const current = String(value ?? local),
    valid =
      !current ||
      (Boolean(parse(current)) &&
        (!min || current >= String(min)) &&
        (!max || current <= String(max)));
  React.useEffect(() => {
    input.current?.setCustomValidity(
      valid ? "" : "请输入有效日期，如2026-11-23",
    );
  }, [valid]);
  useControlPopover(
    open,
    () => {
      setOpen(false);
      setMonthView(false);
    },
    anchor,
    panel,
    304,
  );
  const emit = (next: string) => {
    const el = input.current;
    if (!el) return;
    setLocal(next);
    // Dispatch a real input event so controlled React fields keep their existing handlers.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTouched(false);
    setOpen(false);
    setMonthView(false);
    el.focus();
  };
  const show = () => {
    if (disabled || readOnly) return;
    const d = parse(current) || parse(today())!;
    setMonth([d.getUTCFullYear(), d.getUTCMonth()]);
    setActive(iso(d));
    setMonthView(false);
    setOpen(true);
  };
  const navigate = (delta: number) => {
    const d = new Date(Date.UTC(month[0], month[1] + delta, 1));
    setMonth([d.getUTCFullYear(), d.getUTCMonth()]);
    setYearDraft(String(d.getUTCFullYear()));
  };
  const choose = (date: string) => {
    if ((min && date < String(min)) || (max && date > String(max))) return;
    emit(date);
  };
  const keydown = (e: React.KeyboardEvent<HTMLButtonElement>, date: string) => {
    const delta =
      e.key === "ArrowLeft"
        ? -1
        : e.key === "ArrowRight"
          ? 1
          : e.key === "ArrowUp"
            ? -7
            : e.key === "ArrowDown"
              ? 7
              : 0;
    let next = delta ? offset(date, delta) : "";
    if (e.key === "Home") next = offset(date, -parse(date)!.getUTCDay());
    if (e.key === "End") next = offset(date, 6 - parse(date)!.getUTCDay());
    if (e.key === "PageUp" || e.key === "PageDown") {
      const old = parse(date)!,
        d = new Date(
          Date.UTC(
            old.getUTCFullYear(),
            old.getUTCMonth() + (e.key === "PageDown" ? 1 : -1),
            1,
          ),
        );
      const last = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).getUTCDate();
      d.setUTCDate(Math.min(old.getUTCDate(), last));
      next = iso(d);
    }
    if (next) {
      e.preventDefault();
      setActive(next);
      const d = parse(next)!;
      setMonth([d.getUTCFullYear(), d.getUTCMonth()]);
    }
  };
  const first = new Date(Date.UTC(month[0], month[1], 1)),
    start = new Date(Date.UTC(month[0], month[1], 1 - first.getUTCDay()));
  const dates = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return iso(d);
  });
  const [fieldLabel, setFieldLabel] = React.useState(
    props["aria-label"] || "日期",
  );
  React.useEffect(() => {
    setFieldLabel(
      props["aria-label"] ||
        input.current?.labels?.[0]?.textContent?.replace(/\*/g, "").trim() ||
        "日期",
    );
  }, [id, props["aria-label"]]);
  React.useLayoutEffect(() => {
    if (open && !monthView)
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)
        ?.focus();
  }, [open, monthView, active]);

  const label = fieldLabel;
  return (
    <span className={`ui-date-field ${className}`}>
      <span
        ref={anchor}
        className="ui-date-control"
        data-disabled={disabled || undefined}
      >
        <input
          {...props}
          type="text"
          id={id}
          ref={input}
          name={props.name}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          inputMode="numeric"
          autoComplete="off"
          placeholder={props.placeholder || "年-月-日"}
          value={value !== undefined ? current : undefined}
          defaultValue={value === undefined ? current : undefined}
          onChange={(e) => {
            setLocal(e.target.value);
            onChange?.(e);
          }}
          onBlur={(e) => {
            setTouched(true);
            onBlur?.(e);
          }}
          aria-invalid={!valid || props["aria-invalid"] || undefined}
          aria-describedby={
            !valid && touched
              ? `${calendarId}-error`
              : props["aria-describedby"]
          }
          className="ui-input-content"
          onKeyDown={(e) => {
            props.onKeyDown?.(e);
            if (e.key === "ArrowDown" && !e.defaultPrevented) {
              e.preventDefault();
              show();
            }
          }}
        />
        <button
          type="button"
          className="icon-btn"
          disabled={disabled || readOnly}
          aria-label={`选择${label}`}
          aria-expanded={open}
          aria-controls={calendarId}
          onClick={() => (open ? setOpen(false) : show())}
        >
          <Calendar size={18} aria-hidden="true" />
        </button>
      </span>
      {!valid && touched && (
        <span id={`${calendarId}-error`} className="ui-field-error">
          请输入有效日期，如2026-11-23
        </span>
      )}
      {open && (
        <div
          popover="auto"
          data-ui-popover
          ref={panel}
          id={calendarId}
          className="ui-popover ui-calendar"
          role="dialog"
          aria-label="选择日期"
        >
          <div className="ui-calendar-header">
            <button
              type="button"
              className="icon-btn"
              aria-label={monthView ? "上一年" : "上个月"}
              onClick={() => navigate(monthView ? -12 : -1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ui-calendar-title"
              aria-label="选择年月"
              onClick={() => {
                setYearDraft(String(month[0]));
                setMonthView(!monthView);
              }}
            >
              {month[0]}年{monthView ? "" : `${month[1] + 1}月`}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={monthView ? "下一年" : "下个月"}
              onClick={() => navigate(monthView ? 12 : 1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          {monthView ? (
            <div>
              <label className="ui-calendar-year">
                年份
                <input
                  className="input input-sm"
                  type="number"
                  min={100}
                  max={9999}
                  value={yearDraft}
                  onChange={(e) => {
                    setYearDraft(e.target.value);
                    const n = Number(e.target.value);
                    if (n >= 100 && n <= 9999) setMonth([n, month[1]]);
                  }}
                />
              </label>
              <div className="ui-calendar-months">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      setMonth([month[0], i]);
                      setActive(iso(new Date(Date.UTC(month[0], i, 1))));
                      setMonthView(false);
                    }}
                  >
                    {i + 1}月
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="ui-calendar-week" aria-hidden="true">
                {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div
                role="grid"
                aria-label={`${month[0]}年${month[1] + 1}月`}
                className="ui-calendar-grid"
              >
                {dates.map((date) => (
                  <button
                    type="button"
                    key={date}
                    role="gridcell"
                    data-date={date}
                    data-active={date === active}
                    data-outside={parse(date)!.getUTCMonth() !== month[1]}
                    aria-label={date}
                    aria-selected={date === current}
                    tabIndex={date === active ? 0 : -1}
                    disabled={Boolean(
                      (min && date < String(min)) ||
                        (max && date > String(max)),
                    )}
                    onKeyDown={(e) => keydown(e, date)}
                    onClick={() => choose(date)}
                  >
                    {parse(date)!.getUTCDate()}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="ui-calendar-footer">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => emit("")}
            >
              清空
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={Boolean(
                (min && today() < String(min)) ||
                  (max && today() > String(max)),
              )}
              onClick={() => choose(today())}
            >
              今天
            </button>
          </div>
        </div>
      )}
    </span>
  );
});
export default DateInput;
