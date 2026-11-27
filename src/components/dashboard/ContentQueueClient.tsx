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
  fanpageConnected?: boolean;
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

const connectedTabs = [
  { value: "all", label: "Tất cả" },
  { value: "pending_review", label: "Chờ duyệt (Nội bộ)" },
  { value: "pending_client", label: "Chờ khách duyệt" },
  { value: "changes_requested", label: "Đang sửa lại" },
  { value: "approved", label: "Đã duyệt" },
  { value: "scheduled", label: "Chờ đăng" },
  { value: "published", label: "Đã đăng" },
];

const demoTabs = [
  { value: "all", label: "Tất cả" },
  { value: "pending_review", label: "Chờ duyệt (Nội bộ)" },
  { value: "pending_client", label: "Chờ khách duyệt" },
  { value: "changes_requested", label: "Đang sửa lại" },
  { value: "approved", label: "Đã duyệt" },
];

export function ContentQueueClient({
  canEdit = false,
  mode = "connected",
}: {
  canEdit?: boolean;
  mode?: "connected" | "demo";
}) {
  const isDemo = mode === "demo";
  const tabs = isDemo ? demoTabs : connectedTabs;
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState<string>("");
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const scopedItems = useMemo(
    () => items.filter((item) => (isDemo ? item.fanpageConnected === false : item.fanpageConnected !== false)),
    [items, isDemo],
  );

  const brands = useMemo(() => {
    const map = new Map<string, { key: string; name: string; logoUrl: string | null; total: number; pending: number }>();
    for (const item of scopedItems) {
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
  }, [scopedItems]);

  const brandAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedItems.filter((item) => {
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
  }, [scopedItems, brandFilter, search]);

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
    setNotice(data.message ?? "Đã ghi nhận.");
    await loadContent(true);
    return { ok: true };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
            {isDemo ? "Bài mẫu khách mới" : "Đồng bộ Javis OS"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">
            {isDemo ? "Bài Demo (Chưa gắn Fanpage)" : "Sổ Duyệt Bài"}
          </h1>
          <p className="mt-1 text-xs text-fg-2">
            {isDemo
              ? "Bài viết mẫu cho khách chưa kết nối Fanpage. Admin xem, yêu cầu sửa hoặc duyệt cho khách xem demo trên Portal; sau khi gắn Fanpage ở tab Kết nối, bài sẽ chuyển sang Sổ Duyệt Bài."
              : "Chỉ hiển thị bài viết của khách hàng đã kết nối Fanpage Meta."}
          </p>
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
                    {activeBrand ? activeBrand.name : `Tất cả khách (${scopedItems.length})`}
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
                      <span className="font-mono text-[11px] opacity-75">{scopedItems.length}</span>
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
              <span className="font-mono text-[11px] opacity-75">{scopedItems.length}</span>
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
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filtered.map((item) => (
            <PostReviewModal
              key={item.id}
              inline
              title={item.title}
              code={item.code}
              statusLabel={item.rawStatus || statusLabel[item.status] || item.status}
              pageName={item.customerName}
              logoUrl={item.logoUrl}
              timeLabel={formatPostTime(item.scheduledAt)}
              caption={item.caption}
              mediaUrls={item.mediaUrls}
              actions={canEdit ? item.actions : []}
              approveLabel="Gửi khách duyệt"
              approveHint={
                isDemo
                  ? "Admin duyệt bài demo này. Nếu khách đã có tài khoản Portal, bài chuyển sang Chờ khách duyệt để khách xem mẫu (chưa hẹn đăng Facebook vì chưa gắn Fanpage)."
                  : "Admin duyệt bài này. Nếu fanpage có tài khoản khách, bài chuyển sang Chờ khách duyệt; nếu không, Javis hẹn lịch đăng ngay."
              }
              readOnlyNote={canEdit ? undefined : "Chế độ chỉ xem (không có quyền thao tác duyệt bài)."}
              onAction={(action, feedback) => decide(item, action, feedback)}
              notes={
                <>
                  {item.feedback && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300">
                      <span className="font-semibold">
                        Yêu cầu sửa gần nhất{item.editRequestedByRole === "customer" ? " (từ khách)" : ""}:
                      </span>{" "}
                      {item.feedback}
                    </div>
                  )}
                  {item.scheduleError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                      <span className="font-semibold">Lỗi hẹn đăng:</span> {item.scheduleError}
                    </div>
                  )}
                  {item.feedbackHistory && (
                    <details className="rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-xs text-fg-2">
                      <summary className="cursor-pointer font-semibold text-fg">Lịch sử góp ý</summary>
                      <p className="mt-2 whitespace-pre-line">{item.feedbackHistory}</p>
                    </details>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
