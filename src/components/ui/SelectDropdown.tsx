"use client";

import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  avatarUrl?: string | null;
  avatarText?: string;
  count?: number;
  badge?: number;
};

type SelectDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
  size?: "sm" | "md";
};

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Chọn một mục...",
  ariaLabel,
  className,
  menuClassName,
  size = "md",
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((opt) => opt.value === value) ?? null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2.5 rounded-xl border bg-canvas px-3 text-left transition-colors",
          size === "sm" ? "h-9 text-xs font-medium" : "h-10 text-sm",
          open ? "border-line-accent text-fg" : "border-line text-fg hover:border-line-strong",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.avatarUrl} alt="" className="size-4 shrink-0 rounded-full bg-white object-cover" />
          ) : selected?.avatarText ? (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-accent">
              {selected.avatarText}
            </span>
          ) : null}
          <span className={cn("truncate", !selected && "text-fg-3")}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-fg-3 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: easeOutExpo }}
            className={cn(
              "absolute left-0 z-40 mt-1.5 max-h-60 w-full min-w-[14rem] overflow-y-auto rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl",
              menuClassName,
            )}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors first:mt-0",
                    isSelected ? "bg-accent-muted text-accent" : "text-fg-2 hover:bg-elevated hover:text-fg",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {opt.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.avatarUrl} alt="" className="size-4 shrink-0 rounded-full bg-white object-cover" />
                    ) : opt.avatarText ? (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-accent">
                        {opt.avatarText}
                      </span>
                    ) : null}
                    <span className="min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.sublabel && <span className="block truncate text-[11px] opacity-70">{opt.sublabel}</span>}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5">
                    {typeof opt.count === "number" && (
                      <span className="font-mono text-[11px] opacity-75">{opt.count}</span>
                    )}
                    {typeof opt.badge === "number" && opt.badge > 0 && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-canvas">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && typeof opt.count !== "number" && <Check size={13} className="text-accent" />}
                  </span>
                </button>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
