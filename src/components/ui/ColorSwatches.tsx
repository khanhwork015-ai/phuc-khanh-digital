"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export function ColorSwatches({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!colors || colors.length === 0) return null;

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((prev) => (prev === hex ? null : prev)), 1400);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => void copyHex(hex)}
          title={`Bấm để copy ${hex}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2 py-1 font-mono text-[11px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
        >
          <span
            className="size-3.5 shrink-0 rounded-sm border border-white/15"
            style={{ backgroundColor: hex }}
          />
          <span>{copied === hex ? "Đã copy" : hex}</span>
          {copied === hex && <Check size={11} className="text-emerald-400" />}
        </button>
      ))}
    </div>
  );
}
