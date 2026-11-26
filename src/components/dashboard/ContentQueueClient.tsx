"use client";

import { ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPostTime } from "@/components/content/FacebookPostPreview";
import { PostReviewModal, type ReviewAction } from "@/components/content/PostReviewModal";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ContentRow = {
  id: string;
  code: string;
  title: string;
  caption: string;
  mediaUrls: string[];
  status: string;
  rawStatus: string;
  scheduledAt: string | null;
  customerName: string;
  customerSlug: string | null;
  logoUrl: string | null;
  feedback: string;
  feedbackHistory: string;
  scheduleError: string;
  editRequestedByRole: string;
  postId: string;
  actions: ReviewAction[];
};

const statusLabel: Record<string, string> = {
  pending_review: "Chờ duyệt (Nội bộ)",
  pending_client: "Chờ khách duyệt",
  approved: "Đã duyệt",
  changes_requested: "Đang sửa lại",
  scheduled: "Chờ đăng",
  published: "Đã đăng",
};

const tabs = [
  { value: "all", label: "Tất cả" },
  { value: "pending_review", label: "Chờ duyệt (Nội bộ)" },
  { value: "pending_client", label: "Chờ khách duyệt" },
  { value: "changes_requested", label: "Đang sửa lại" },
  { value: "approved", label: "Đã duyệt" },
  { value: "scheduled", label: "Chờ đăng" },
  { value: "published", label: "Đã đăng" },
];

export function ContentQueueClient({ canEdit = false }: { canEdit?: boolean }) {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState<string>("");
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!brandMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!brandDropdownRef.current?.contains(e.target as Node)) {
        setBrandMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBrandMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [brandMenuOpen]);

  const loadContent = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        items?: ContentRow[];
        syncResult?: { enabled: boolean; customersSynced: number; contentSynced: number; error?: string };
      };
      if (res.ok && json.ok && json.items) {
        setItems(json.items);
        if (json.syncResult?.error) setSyncInfo(`Lỗi đồng bộ: ${json.syncResult.error}`);
        else if (json.syncResult?.enabled)
          setSyncInfo(`Đồng bộ trực tiếp từ Javis: ${json.syncResult.contentSynced} bài.`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const brands = useMemo(() => {
    const map = new Map<string, { key: string; name: string; logoUrl: string | null; total: number; pending: number }>();
    for (const item of items) {
      const key = item.customerSlug || item.customerName;
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (item.status === "pending_review") existing.pending += 1;
      } else {
        map.set(key, {
          key,
          name: item.customerName,
          logoUrl: item.logoUrl,
          total: 1,
          pending: item.status === "pending_review" ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [items]);

  const brandAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const key = item.customerSlug || item.customerName;
      if (brandFilter !== "all" && key !== brandFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.caption.toLowerCase().includes(q)
      );
    });
  }, [items, brandFilter, search]);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const filtered = useMemo(
    () =>
      filter === "all"
        ? brandAndSearchFiltered
        : brandAndSearchFiltered.filter((i) => i.status === filter),
    [brandAndSearchFiltered, filter],
  );

  const countOf = (v: string) =>
    v === "all" ? brandAndSearchFiltered.length : brandAndSearchFiltered.filter((i) => i.status === v).length;

  const activeBrand = brands.find((b) => b.key === brandFilter) ?? null;

  const hasActiveFilter = filter !== "all" || brandFilter !== "all" || search.trim() !== "";

  function resetFilters() {
    setFilter("all");
    setBrandFilter("all");
    setSearch("");
  }

  async function decide(item: ContentRow, action: ReviewAction, feedback?: string) {
    const res = await fetch(`/api/admin/content/${item.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, feedback }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) return { ok: false, message: data.message ?? "Thao tác thất bại." };
    setSelectedId(null);
    setNotice(data.message ?? "Đã ghi nhận.");
    await loadContent(true);
    return { ok: true };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Đồng bộ Javis OS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Sổ Duyệt Bài</h1>
          {syncInfo && <p className="mt-1 text-xs text-emerald-300">{syncInfo}</p>}
        </div>
        <button
          type="button"
          onClick={() => void loadContent()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-medium text-fg hover:border-line-strong"
        >
          <RefreshCw size={14} />
          <span>Quét lại từ Javis</span>
        </button>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs text-emerald-300 hover:underline">
            Ẩn
          </button>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-line bg-surface/60 p-3.5 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tiêu đề, mã bài, nội dung..."
              className="h-9 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div ref={brandDropdownRef} className="relative flex-1 sm:flex-none">
              <button
                type="button"
                aria-expanded={brandMenuOpen}
                onClick={() => setBrandMenuOpen((prev) => !prev)}
                className={cn(
                  "inline-flex h-9 w-full items-center justify-between gap-2.5 rounded-xl border bg-canvas px-3 text-xs font-medium transition-colors sm:min-w-52",
                  brandMenuOpen || brandFilter !== "all"
                    ? "border-line-accent text-fg"
                    : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {activeBrand ? (
                    activeBrand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeBrand.logoUrl} alt="" className="size-4 shrink-0 rounded-full bg-white object-cover" />
                    ) : (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-accent">
                        {activeBrand.name.charAt(0).toUpperCase()}
                      </span>
                    )
                  ) : null}
                  <span className="truncate">
                    {activeBrand ? activeBrand.name : `Tất cả khách (${items.length})`}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className={cn("shrink-0 text-fg-3 transition-transform duration-200", brandMenuOpen && "rotate-180")}
                />
              </button>

              <AnimatePresence>
                {brandMenuOpen && (
                  <m.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: easeOutExpo }}
                    className="absolute right-0 z-30 mt-1.5 w-64 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setBrandFilter("all");
                        setBrandMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        brandFilter === "all"
                          ? "bg-accent-muted text-accent"
                          : "text-fg-2 hover:bg-elevated hover:text-fg",
                      )}
                    >
                      <span>Tất cả khách</span>
                      <span className="font-mono text-[11px] opacity-75">{items.length}</span>
                    </button>

                    {brands.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => {
                          setBrandFilter(b.key);
                          setBrandMenuOpen(false);
                        }}
                        className={cn(
                          "mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                          brandFilter === b.key
                            ? "bg-accent-muted text-accent"
                            : "text-fg-2 hover:bg-elevated hover:text-fg",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {b.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.logoUrl} alt="" className="size-4 shrink-0 rounded-full bg-white object-cover" />
                          ) : (
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-accent">
                              {b.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="truncate">{b.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="font-mono text-[11px] opacity-75">{b.total}</span>
                          {b.pending > 0 && (
                            <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-canvas">
                              {b.pending}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-line bg-canvas px-2.5 text-xs text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
              >
                <X size={13} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {brands.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setBrandFilter("all")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                brandFilter === "all"
                  ? "border-line-strong bg-elevated text-fg"
                  : "border-transparent bg-canvas/50 text-fg-3 hover:border-line hover:bg-canvas hover:text-fg",
              )}
            >
              <span>Tất cả</span>
              <span className="font-mono text-[11px] opacity-75">{items.length}</span>
            </button>
            {brands.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setBrandFilter(b.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                  brandFilter === b.key
                    ? "border-line-accent bg-accent-muted text-accent"
                    : "border-transparent bg-canvas/50 text-fg-2 hover:border-line hover:bg-canvas hover:text-fg",
                )}
              >
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt="" className="size-4 rounded-full bg-white object-cover" />
                ) : (
                  <span className="flex size-4 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-accent">
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{b.name}</span>
                <span className="font-mono text-[11px] opacity-75">{b.total}</span>
                {b.pending > 0 && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-canvas">
                    {b.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          {tabs.map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "relative rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "text-canvas" : "border border-line bg-canvas/80 text-fg-2 hover:text-fg",
                )}
              >
                {active && (
                  <m.span
                    layoutId="admin-content-status-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-accent"
                  />
                )}
                <span className="relative z-10">
                  {tab.label} <span className="opacity-75">({countOf(tab.value)})</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
          <p>Chưa có bài viết nào phù hợp bộ lọc hiện tại.</p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 inline-flex h-9 items-center rounded-xl border border-line bg-canvas px-4 text-xs font-medium text-accent hover:border-line-accent"
            >
              Xóa bộ lọc để xem tất cả
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item, idx) => (
            <m.button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
              className="group w-full rounded-2xl border border-line bg-surface/80 p-4 text-left transition-colors hover:border-line-accent hover:bg-surface sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  {item.mediaUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrls[0]}
                      alt=""
                      className="size-16 shrink-0 rounded-xl border border-line object-cover"
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-accent">{item.customerName}</span>
                      <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-fg-2">
                        {item.rawStatus || statusLabel[item.status] || item.status}
                      </span>
                      {item.mediaUrls.length > 0 && (
                        <span className="rounded-lg border border-line bg-elevated px-2 py-0.5 font-mono text-[10px] text-fg-3">
                          {item.mediaUrls.length} ảnh
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-fg transition-colors group-hover:text-accent">
                      {item.title}
                    </h2>
                    <p className="font-mono text-xs text-fg-3">
                      {item.code} · {formatPostTime(item.scheduledAt)}
                    </p>
                    {item.feedback && <p className="line-clamp-2 text-xs text-amber-300">Yêu cầu sửa: {item.feedback}</p>}
                    {item.scheduleError && <p className="line-clamp-2 text-xs text-red-300">Lỗi hẹn đăng: {item.scheduleError}</p>}
                  </div>
                </div>
                <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-line bg-canvas px-3.5 text-xs font-medium text-fg-2 transition-colors group-hover:border-line-accent group-hover:text-accent">
                  Xem bài đăng
                </span>
              </div>
            </m.button>
          ))}
        </div>
      )}

      {selected && (
        <PostReviewModal
          key={selected.id}
          title={selected.title}
          code={selected.code}
          statusLabel={selected.rawStatus || statusLabel[selected.status] || selected.status}
          pageName={selected.customerName}
          logoUrl={selected.logoUrl}
          timeLabel={formatPostTime(selected.scheduledAt)}
          caption={selected.caption}
          mediaUrls={selected.mediaUrls}
          actions={canEdit ? selected.actions : []}
          approveLabel="Gửi khách duyệt"
          approveHint="Admin duyệt bài này. Nếu fanpage có tài khoản khách, bài chuyển sang Chờ khách duyệt; nếu không, Javis hẹn lịch đăng ngay."
          readOnlyNote={canEdit ? undefined : "Chế độ chỉ xem (không có quyền thao tác duyệt bài)."}
          onAction={(action, feedback) => decide(selected, action, feedback)}
          onClose={() => setSelectedId(null)}
          notes={
            <>
              {selected.feedback && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                  <span className="font-semibold">
                    Yêu cầu sửa gần nhất{selected.editRequestedByRole === "customer" ? " (từ khách)" : ""}:
                  </span>{" "}
                  {selected.feedback}
                </div>
              )}
              {selected.scheduleError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
                  <span className="font-semibold">Lỗi hẹn đăng:</span> {selected.scheduleError}
                </div>
              )}
              {selected.feedbackHistory && (
                <details className="rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-xs text-fg-2">
                  <summary className="cursor-pointer font-semibold text-fg">Lịch sử góp ý</summary>
                  <p className="mt-2 whitespace-pre-line">{selected.feedbackHistory}</p>
                </details>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
