"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { ChevronDownIcon, CheckIcon } from "@/components/ui/icons";

type FieldSize = "sm" | "md";

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: "px-2 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
};

type SelectOption = { value: string; label: ReactNode };

function optionsFromChildren(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<{ value?: string; children?: ReactNode }>(child) && child.props) {
      options.push({
        value: child.props.value != null ? String(child.props.value) : "",
        label: child.props.children,
      });
    }
  });
  return options;
}

export interface SelectProps {
  name?: string;
  /** Associates the hidden input (and thus this field's value) with a
   * <form id="..."> elsewhere in the document, same as the native form=
   * attribute — needed when the trigger renders outside its form (e.g. a
   * table cell next to a form that lives in a separate expandable row). */
  form?: string;
  defaultValue?: string | number;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  uiSize?: FieldSize;
  className?: string;
  placeholder?: string;
  children: ReactNode;
}

export function Select({
  name,
  form,
  defaultValue,
  value,
  onChange,
  disabled,
  uiSize = "md",
  className,
  placeholder,
  children,
}: SelectProps) {
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    defaultValue != null ? String(defaultValue) : "",
  );
  const [highlighted, setHighlighted] = useState(0);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  const selected = value !== undefined ? value : internalValue;
  const selectedIndex = options.findIndex((o) => o.value === selected);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);

  function commit(next: string) {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openMenu() {
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const estimatedPanelHeight = Math.min(options.length * 36 + 8, 256);
      const openUp = rect.bottom + estimatedPanelHeight > window.innerHeight && rect.top > estimatedPanelHeight;
      // The panel can grow up to 320px wide (see maxWidth below), wider
      // than most triggers — left-aligning it with the trigger unchecked
      // would push it past the right edge on a narrow screen whenever the
      // trigger itself sits right-of-center (e.g. the Source select next
      // to Category in a transaction row). Clamp so it stays on-screen,
      // preferring to hang right off the trigger but sliding left as
      // needed, with an 8px margin on either edge as a last resort.
      const estimatedPanelWidth = Math.max(rect.width, 320);
      const left = Math.min(rect.left, window.innerWidth - estimatedPanelWidth - 8);
      setPlacement({
        top: openUp ? rect.top : rect.bottom,
        left: Math.max(8, left),
        width: rect.width,
        openUp,
      });
    }
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll(event: Event) {
      // Scrolling inside the panel's own option list must not close it —
      // only close when something outside (the page, another container)
      // scrolls, since that would invalidate the trigger-relative position.
      const target = event.target;
      if (panelRef.current && target instanceof Node && panelRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function handleResize() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[highlighted];
      if (option) commit(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      {name && <input type="hidden" name={name} form={form} value={selected} />}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background text-left transition-colors duration-150",
          "hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60",
          SIZE_CLASSES[uiSize],
          className,
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted")}>
          {selectedOption?.label ?? placeholder ?? ""}
        </span>
        <ChevronDownIcon size={14} className={cn("shrink-0 text-muted transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open &&
        placement &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            className="fixed z-50 max-h-64 overflow-y-auto rounded-md border border-card-border bg-surface py-1 text-sm shadow-elevated"
            style={{
              left: placement.left,
              minWidth: placement.width,
              maxWidth: Math.max(placement.width, 320),
              ...(placement.openUp
                ? { bottom: window.innerHeight - placement.top }
                : { top: placement.top }),
            }}
          >
            {options.map((option, index) => (
              <li
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={option.value === selected}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => commit(option.value)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 truncate",
                  index === highlighted ? "bg-surface-subtle" : "",
                  option.value === selected ? "font-medium" : "",
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.value === selected && <CheckIcon size={14} className="shrink-0 text-foreground" />}
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-1.5 text-muted">No options</li>
            )}
          </ul>,
          document.body,
        )}
    </>
  );
}
