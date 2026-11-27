"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "pkd-theme";

function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyThemeToDom(pref: ThemePreference) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

const options: Array<{ value: ThemePreference; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "Theo máy", icon: Monitor },
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
];

export function ThemeToggle({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "full";
  className?: string;
}) {
  const [preference, setPreference] = useState<ThemePreference>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      const initial: ThemePreference =
        saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
      setPreference(initial);
      applyThemeToDom(initial);
    } catch {
      applyThemeToDom("dark");
    }
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyThemeToDom("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  function selectTheme(next: ThemePreference) {
    setPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors in private mode
    }
    applyThemeToDom(next);
  }

  return (
    <div
      role="group"
      aria-label="Chế độ giao diện"
      className={cn(
        "inline-flex items-center rounded-xl border border-line bg-surface/90 p-0.5",
        variant === "full" && "grid w-full grid-cols-3 gap-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectTheme(opt.value)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[10px] transition-colors",
              variant === "full" ? "h-8 px-2 text-[11px] font-medium" : "size-8",
              active
                ? "bg-accent text-canvas font-semibold"
                : "text-fg-2 hover:text-fg",
            )}
          >
            <Icon size={14} strokeWidth={1.8} />
            {variant === "full" && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
