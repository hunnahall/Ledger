"use client";

import {
  Children,
  isValidElement,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { FIELD_BASE, type FieldSize } from "@/components/ui/input";
import { ChevronDownIcon, ChevronRightIcon, CheckIcon } from "@/components/ui/icons";
import { useAnchoredPopover } from "@/components/ui/use-anchored-popover";

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

interface SelectProps {
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
  /** Options that open a flyout menu on hover, keyed by the parent option's
   * value. Picking a flyout item commits that item's value; the parent
   * option itself only opens the flyout. */
  submenus?: Record<string, SelectOption[]>;
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
  submenus,
  children,
}: SelectProps) {
  // Not memoized on `children`: JSX children are rebuilt on every render, so
  // the dependency never compares equal and a useMemo here only ever added
  // its own bookkeeping on top of a walk that ran regardless. The walk itself
  // is cheap — it reads props off an already-built element list.
  const options = optionsFromChildren(children);
  const [internalValue, setInternalValue] = useState(
    defaultValue != null ? String(defaultValue) : "",
  );
  const [highlighted, setHighlighted] = useState(0);
  const [flyout, setFlyout] = useState<{ value: string; top: number; left: number } | null>(null);
  const { open, setOpen, openPanel, placement, panelStyle, triggerRef, panelRef } =
    useAnchoredPopover<HTMLButtonElement, HTMLUListElement>({
      estimatedHeight: Math.min(options.length * 36 + 8, 256),
    });

  const selected = value !== undefined ? value : internalValue;
  const selectedIndex = options.findIndex((o) => o.value === selected);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function commit(next: string) {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
    setFlyout(null);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openFlyout(value: string, item: HTMLElement) {
    const rect = item.getBoundingClientRect();
    const width = 224;
    const left = rect.right + width > window.innerWidth - 8 ? rect.left - width : rect.right;
    setFlyout({ value, top: rect.top, left: Math.max(8, left) });
  }

  function openMenu() {
    setFlyout(null);
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    openPanel();
  }

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
      if (option && !submenus?.[option.value]) commit(option.value);
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
          FIELD_BASE,
          "flex w-full items-center justify-between gap-2 text-left",
          SIZE_CLASSES[uiSize],
          className,
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted")}>
          {selectedOption?.label ?? placeholder ?? ""}
        </span>
        <ChevronDownIcon size={14} className={cn("shrink-0 text-muted transition-transform duration-[120ms] ease-standard", open && "rotate-180")} />
      </button>

      {open &&
        placement &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            // Fades and settles into place rather than snapping in. The
            // pre-open state is @starting-style (Tailwind's `starting:`), so
            // the entrance needs no mount-and-flip state of its own.
            className={cn(
              "fixed z-50 max-h-64 overflow-y-auto border border-border-strong bg-surface-2 py-1 text-sm shadow-popover",
              "transition-[opacity,transform] duration-[120ms] ease-entrance",
              "opacity-100 translate-y-0 starting:opacity-0 starting:-translate-y-1",
            )}
            style={{ ...panelStyle, maxWidth: Math.max(placement.width, 320) }}
          >
            {options.map((option, index) => (
              <li
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={option.value === selected}
                onMouseEnter={(event) => {
                  setHighlighted(index);
                  if (submenus?.[option.value]) openFlyout(option.value, event.currentTarget);
                  else setFlyout(null);
                }}
                onClick={(event) =>
                  submenus?.[option.value]
                    ? openFlyout(option.value, event.currentTarget)
                    : commit(option.value)
                }
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 truncate",
                  index === highlighted ? "bg-fill-hover" : "",
                  option.value === selected ? "font-medium" : "",
                )}
              >
                <span className="truncate">{option.label}</span>
                {submenus?.[option.value] ? (
                  <ChevronRightIcon size={14} className="shrink-0 text-muted" />
                ) : (
                  option.value === selected && <CheckIcon size={14} className="shrink-0 text-foreground" />
                )}
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-1.5 text-muted">No options</li>
            )}
          </ul>,
          document.body,
        )}

      {open &&
        flyout &&
        submenus?.[flyout.value] &&
        createPortal(
          <ul
            role="listbox"
            data-popover-child
            className="fixed z-50 max-h-64 w-56 overflow-y-auto border border-border-strong bg-surface-2 py-1 text-sm shadow-popover"
            style={{ top: flyout.top, left: flyout.left }}
          >
            {submenus[flyout.value].map((item) => (
              <li
                key={item.value}
                role="option"
                aria-selected={false}
                onClick={() => commit(item.value)}
                className="flex cursor-pointer items-center truncate px-3 py-1.5 hover:bg-fill-hover"
              >
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
