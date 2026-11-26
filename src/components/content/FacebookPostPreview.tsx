"use client";

import { Globe, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PREVIEW_CHARS = 140;
const PREVIEW_LINES = 2;

/** Cuts the caption the way Facebook does: a few lines or ~280 chars, then "... Xem thêm". */
function previewOf(text: string): { short: string; truncated: boolean } {
  const lines = text.split("\n");
  let short = lines.slice(0, PREVIEW_LINES).join("\n");
  if (short.length > PREVIEW_CHARS) {
    const cut = short.slice(0, PREVIEW_CHARS);
    const lastSpace = cut.lastIndexOf(" ");
    short = lastSpace > PREVIEW_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut;
  }
  short = short.trimEnd();
  return { short, truncated: short.length < text.trim().length };
}

export function FacebookPostPreview({
  pageName,
  logoUrl,
  timeLabel,
  caption,
  mediaUrls,
  onOpenImage,
}: {
  pageName: string;
  logoUrl?: string | null;
  timeLabel: string;
  caption: string;
  mediaUrls: string[];
  onOpenImage?: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = caption.trim();
  const { short, truncated } = previewOf(text);
  const shown = mediaUrls.slice(0, 4);
  const extra = mediaUrls.length - shown.length;

  return (
    <div className="overflow-hidden rounded-xl border border-[#3a3b3c] bg-[#242526] text-[#e4e6eb] shadow-lg">
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={pageName} className="size-10 shrink-0 rounded-full bg-white object-cover" />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-canvas">
            {pageName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight">{pageName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#b0b3b8]">
            <span>{timeLabel}</span>
            <span>·</span>
            <Globe size={12} />
          </p>
        </div>
      </div>

      <div className="px-4 pb-3 text-[15px] leading-[1.45] whitespace-pre-line break-words">
        {!text ? (
          <span className="text-[#b0b3b8]">(Chưa có nội dung bài viết)</span>
        ) : expanded || !truncated ? (
          <>
            {text}
            {truncated && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="font-semibold text-[#e4e6eb] hover:underline"
                >
                  Ẩn bớt
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {short}
            {"... "}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-semibold text-[#e4e6eb] hover:underline"
            >
              Xem thêm
            </button>
          </>
        )}
      </div>

      {shown.length > 0 && (
        <div className={cn("grid gap-0.5 bg-black", shown.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {shown.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onOpenImage?.(url)}
              className={cn(
                "relative block w-full overflow-hidden bg-black focus:outline-none",
                shown.length === 3 && i === 0 && "col-span-2",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Ảnh ${i + 1}`}
                className={cn(
                  "w-full",
                  shown.length === 1 ? "max-h-[520px] object-contain" : "h-56 object-cover",
                )}
              />
              {extra > 0 && i === shown.length - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl font-bold text-white">
                  +{extra}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mx-3 flex items-center justify-around border-t border-[#3a3b3c] py-2 text-[13px] font-semibold text-[#b0b3b8]">
        <span className="inline-flex items-center gap-1.5 px-3 py-1">
          <ThumbsUp size={15} /> Thích
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1">
          <MessageCircle size={15} /> Bình luận
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1">
          <Share2 size={15} /> Chia sẻ
        </span>
      </div>
    </div>
  );
}

export function formatPostTime(raw: string | null, fallback = "Chưa hẹn giờ đăng"): string {
  if (!raw) return fallback;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
