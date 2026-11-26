"use client";

import { MapPin, MessageSquareQuote, Palette, Phone, Sparkles } from "lucide-react";
import { ColorSwatches } from "@/components/ui/ColorSwatches";

type BrandKitSummaryProps = {
  brandName: string;
  logoUrl?: string | null;
  hotline?: string | null;
  address?: string | null;
  tone?: string | null;
  style?: string | null;
  colors?: string[];
};

export function BrandKitSummary({
  brandName,
  logoUrl,
  hotline,
  address,
  tone,
  style,
  colors = [],
}: BrandKitSummaryProps) {
  const fields = [
    { label: "Số điện thoại / Hotline", value: hotline, icon: Phone },
    { label: "Địa chỉ", value: address, icon: MapPin },
    { label: "Giọng văn", value: tone, icon: MessageSquareQuote },
    { label: "Phong cách", value: style, icon: Sparkles },
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={brandName}
            className="size-16 shrink-0 rounded-2xl border border-line bg-white object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-line bg-accent/15 text-xl font-bold text-accent">
            {brandName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Bộ nhận diện thương hiệu</p>
          <h2 className="mt-1 truncate text-xl font-bold text-fg">{brandName}</h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.label} className="rounded-xl border border-line bg-canvas/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-fg-3">
                <Icon size={14} className="text-accent" />
                <span>{field.label}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-fg">
                {field.value?.trim() || <span className="text-fg-3">Chưa cập nhật</span>}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-canvas/70 p-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-fg-3">
          <Palette size={14} className="text-accent" />
          <span>Màu chủ đạo</span>
        </div>
        <div className="mt-2">
          {colors.length > 0 ? (
            <ColorSwatches colors={colors} />
          ) : (
            <p className="text-sm text-fg-3">Chưa cập nhật mã màu (#HEX)</p>
          )}
        </div>
      </div>
    </section>
  );
}
