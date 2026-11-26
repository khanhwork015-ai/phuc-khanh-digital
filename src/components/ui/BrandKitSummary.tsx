"use client";

import { Check, ExternalLink, FileCheck2 } from "lucide-react";
import { useState } from "react";

export type BrandKitSummaryProps = {
  brandName: string;
  brandCode?: string | null;
  logoUrl?: string | null;
  logoLabel?: string | null;
  hotline?: string | null;
  address?: string | null;
  pronouns?: string | null;
  tone?: string | null;
  style?: string | null;
  avoidWords?: string[];
  pricingLines?: Array<{ name: string; price: string }>;
  colors?: string[];
};

export function BrandKitSummary({
  brandName,
  brandCode,
  logoUrl,
  logoLabel,
  hotline,
  address,
  pronouns,
  tone,
  style,
  avoidWords = [],
  pricingLines = [],
  colors = [],
}: BrandKitSummaryProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex((prev) => (prev === hex ? null : prev)), 1400);
    } catch {
      setCopiedHex(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brandName}
              className="size-8 shrink-0 rounded-lg border border-line bg-white object-cover"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-accent/15 text-xs font-bold text-accent">
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="truncate font-mono text-xs text-fg-2 sm:text-sm">
            Hồ sơ thương hiệu · <span className="font-semibold text-fg">{brandName}</span>
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs text-fg-3">{brandCode || "riêng biệt"}</span>
      </div>

      <div className="divide-y divide-line px-5 sm:px-6">
        <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
          <span className="text-xs font-medium text-fg-3 sm:text-sm">Bảng màu</span>
          <div>
            {colors.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {colors.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => void copyHex(hex)}
                    title={`Bấm để copy ${hex}`}
                    className="group relative flex size-7 items-center justify-center rounded-lg border border-white/15 transition-transform hover:scale-105"
                    style={{ backgroundColor: hex }}
                  >
                    {copiedHex === hex && (
                      <span className="rounded bg-black/75 px-1 py-0.5 font-mono text-[9px] text-white">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-1 font-mono text-[11px] text-fg-3">
                  {copiedHex ? `Đã copy ${copiedHex}` : colors.join(" · ")}
                </span>
              </div>
            ) : (
              <span className="text-sm text-fg-3">Chưa cập nhật</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
          <span className="text-xs font-medium text-fg-3 sm:text-sm">Xưng hô</span>
          <p className="text-sm font-medium text-fg">
            {pronouns?.trim() || <span className="font-normal text-fg-3">Chưa cập nhật</span>}
          </p>
        </div>

        {(tone || style) && (
          <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
            <span className="text-xs font-medium text-fg-3 sm:text-sm">Giọng văn &amp; Style</span>
            <p className="text-sm text-fg-2">
              {[tone, style].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
          <span className="text-xs font-medium text-fg-3 sm:text-sm">Từ cần tránh</span>
          <div>
            {avoidWords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {avoidWords.map((word) => (
                  <span
                    key={word}
                    className="rounded-lg border border-rose-500/20 bg-canvas px-2.5 py-1 text-xs text-rose-300/80 line-through"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-fg-3">Chưa cập nhật</span>
            )}
          </div>
        </div>

        {(hotline || address) && (
          <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
            <span className="text-xs font-medium text-fg-3 sm:text-sm">Liên hệ</span>
            <p className="text-sm text-fg-2">
              {[hotline, address].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        {pricingLines.length > 0 && (
          <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4">
            <span className="text-xs font-medium text-fg-3 sm:text-sm">Bảng giá</span>
            <div className="space-y-1.5">
              {pricingLines.map((row) => (
                <div key={`${row.name}-${row.price}`} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-fg-2">{row.name}</span>
                  <span className="font-mono font-medium text-fg">{row.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
          <span className="text-xs font-medium text-fg-3 sm:text-sm">Logo gốc</span>
          <div>
            {logoUrl ? (
              <a
                href={logoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-line-accent bg-accent-muted/40 px-3 py-1.5 font-mono text-xs text-accent transition-colors hover:bg-accent-muted"
              >
                <FileCheck2 size={14} />
                <span>{logoLabel || "logo-chinh-thuc"}</span>
                <Check size={13} />
                <ExternalLink size={11} className="opacity-70" />
              </a>
            ) : (
              <span className="text-sm text-fg-3">Chưa có tệp logo</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
