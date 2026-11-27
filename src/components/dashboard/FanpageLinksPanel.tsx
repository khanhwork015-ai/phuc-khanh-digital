"use client";

import { Check, ChevronDown, Link2, Link2Off, RefreshCw } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Checklist = { logo: boolean; brand_kit: boolean; forbidden_words: boolean; posts: number };

type BrandItem = {
  slug: string;
  name: string;
  page_id: string;
  page_name: string;
  connected: boolean;
  checklist: Checklist;
};

type PageItem = { id: string; name: string; linked_slug: string };

type LinksResponse = {
  ok?: boolean;
  message?: string;
  brands?: BrandItem[];
  pages?: PageItem[];
  syncedAt?: string;
};

type Notice = { type: "error" | "success"; text: string };

const SYNC_POLL_MS = 6000;
const SYNC_POLL_MAX = 30;

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300",
      )}
    >
      {ok ? "✓" : "!"} {label}
    </span>
  );
}

/** Admin-only: bind each brand (brand kit + posts) to one connected Meta Fanpage. */
export function FanpageLinksPanel({ onChanged }: { onChanged?: () => void }) {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [syncedAt, setSyncedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [openMenuSlug, setOpenMenuSlug] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuSlug) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuContainerRef.current?.contains(e.target as Node)) {
        setOpenMenuSlug(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuSlug(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuSlug]);

  const load = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch("/api/admin/fanpages/links", { cache: "no-store" });
      const json = (await res.json()) as LinksResponse;
      if (!res.ok || !json.ok) {
        setNotice({ type: "error", text: json.message ?? "Không tải được danh sách Fanpage Meta." });
        return "";
      }
      setBrands(json.brands ?? []);
      setPages(json.pages ?? []);
      setSyncedAt(json.syncedAt ?? "");
      return json.syncedAt ?? "";
    } catch {
      setNotice({ type: "error", text: "Lỗi kết nối khi tải danh sách Fanpage Meta." });
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [load]);

  async function post(body: Record<string, string>): Promise<{ ok: boolean; message: string; heldPosts: number }> {
    try {
      const res = await fetch("/api/admin/fanpages/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; heldPosts?: number };
      return { ok: Boolean(res.ok && json.ok), message: json.message ?? "", heldPosts: json.heldPosts ?? 0 };
    } catch {
      return { ok: false, message: "Lỗi kết nối.", heldPosts: 0 };
    }
  }

  async function handleLink(brand: BrandItem) {
    const pageId = picked[brand.slug];
    if (!pageId || busy) return;
    setBusy(brand.slug);
    setNotice(null);
    const r = await post({ action: "link", slug: brand.slug, pageId });
    if (r.ok) {
      const pageName = pages.find((p) => p.id === pageId)?.name ?? pageId;
      setNotice({
        type: "success",
        text:
          `Đã gắn "${brand.name}" với Fanpage "${pageName}".` +
          (r.heldPosts > 0 ? ` ${r.heldPosts} bài đang chờ sẽ được thử lên lịch lại.` : ""),
      });
      setPicked((prev) => ({ ...prev, [brand.slug]: "" }));
      await load();
      onChanged?.();
    } else {
      setNotice({ type: "error", text: r.message || "Không gắn được Fanpage." });
    }
    setBusy(null);
  }

  async function handleUnlink(brand: BrandItem) {
    if (busy) return;
    if (!window.confirm(`Gỡ Fanpage khỏi brand "${brand.name}"? Hồ sơ và bài viết vẫn được giữ lại.`)) return;
    setBusy(brand.slug);
    setNotice(null);
    const r = await post({ action: "unlink", slug: brand.slug });
    if (r.ok) {
      setNotice({ type: "success", text: `Đã gỡ gắn Fanpage khỏi "${brand.name}".` });
      await load();
      onChanged?.();
    } else {
      setNotice({ type: "error", text: r.message || "Không gỡ gắn được." });
    }
    setBusy(null);
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setNotice(null);
    const before = syncedAt;
    const r = await post({ action: "sync" });
    if (!r.ok) {
      setSyncing(false);
      setNotice({ type: "error", text: r.message || "Không gửi được yêu cầu đồng bộ." });
      return;
    }
    setNotice({
      type: "success",
      text: r.message || "Đã gửi yêu cầu cho Javis, khoảng 1 đến 2 phút sẽ có danh sách mới.",
    });
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const now = await load();
      if (now && now !== before) {
        setSyncing(false);
        setNotice({ type: "success", text: "Đã cập nhật danh sách Fanpage mới nhất." });
        return;
      }
      if (tries >= SYNC_POLL_MAX) {
        setSyncing(false);
        setNotice({
          type: "error",
          text: "Chưa nhận được danh sách mới. Kiểm tra Javis đã bật AI tự vận hành chưa rồi bấm lại.",
        });
        return;
      }
      pollTimer.current = setTimeout(() => void tick(), SYNC_POLL_MS);
    };
    pollTimer.current = setTimeout(() => void tick(), SYNC_POLL_MS);
  }

  const unlinkedCount = brands.filter((b) => !b.connected).length;

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-fg">Gắn Fanpage Meta với brand</h2>
          <p className="mt-1 text-xs text-fg-2">
            Chọn Fanpage đã kết nối Meta để gắn với brand. Brand kit và bài viết của brand sẽ đăng lên đúng Fanpage đó.
            {syncedAt ? ` Danh sách cập nhật lúc ${syncedAt}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-medium text-fg hover:border-line-strong disabled:opacity-60"
        >
          <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
          <span>{syncing ? "Đang lấy danh sách..." : "Lấy danh sách Fanpage mới nhất"}</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={cn(
            "rounded-xl border px-4 py-2.5 text-xs font-medium",
            notice.type === "error"
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
          )}
        >
          {notice.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fg-2">Đang tải...</p>
      ) : brands.length === 0 ? (
        <p className="text-sm text-fg-2">Chưa có brand nào trong hệ thống.</p>
      ) : (
        <div ref={menuContainerRef} className="divide-y divide-line rounded-xl border border-line">
          {brands.map((b) => {
            const choice = picked[b.slug] ?? "";
            const selectedPage = pages.find((p) => p.id === choice) ?? null;
            const menuOpen = openMenuSlug === b.slug;
            return (
              <div key={b.slug} className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{b.name}</p>
                  <p className="font-mono text-[11px] text-fg-3">{b.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip ok={b.checklist.brand_kit} label="Brand kit" />
                    <Chip ok={b.checklist.logo} label="Logo" />
                    <Chip ok={b.checklist.forbidden_words} label="Từ cấm" />
                    <span className="inline-flex rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-2">
                      {b.checklist.posts} bài
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {b.connected ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                        <Link2 size={13} />
                        {b.page_name || "Fanpage"} · {b.page_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleUnlink(b)}
                        disabled={busy === b.slug}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-xs font-medium text-fg-2 hover:text-fg disabled:opacity-60"
                      >
                        <Link2Off size={13} />
                        Gỡ gắn
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          aria-expanded={menuOpen}
                          aria-label={`Chọn Fanpage cho ${b.name}`}
                          onClick={() => setOpenMenuSlug((prev) => (prev === b.slug ? null : b.slug))}
                          className={cn(
                            "inline-flex h-10 w-full min-w-[260px] items-center justify-between gap-2.5 rounded-xl border bg-canvas px-3 text-xs font-medium transition-colors sm:w-72",
                            menuOpen || choice
                              ? "border-line-accent text-fg"
                              : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                          )}
                        >
                          <span className="truncate">
                            {selectedPage ? `${selectedPage.name} (${selectedPage.id})` : "Chọn Fanpage đã kết nối..."}
                          </span>
                          <ChevronDown
                            size={14}
                            className={cn("shrink-0 text-fg-3 transition-transform duration-200", menuOpen && "rotate-180")}
                          />
                        </button>

                        <AnimatePresence>
                          {menuOpen && (
                            <m.div
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: easeOutExpo }}
                              className="absolute right-0 z-30 mt-1.5 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl sm:w-80"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPicked((prev) => ({ ...prev, [b.slug]: "" }));
                                  setOpenMenuSlug(null);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                                  !choice
                                    ? "bg-accent-muted text-accent"
                                    : "text-fg-2 hover:bg-elevated hover:text-fg",
                                )}
                              >
                                <span>Chọn Fanpage đã kết nối...</span>
                                {!choice && <Check size={13} className="shrink-0" />}
                              </button>
                              {pages.map((p) => {
                                const disabled = Boolean(p.linked_slug);
                                const selected = choice === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      setPicked((prev) => ({ ...prev, [b.slug]: p.id }));
                                      setOpenMenuSlug(null);
                                    }}
                                    className={cn(
                                      "mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                                      disabled
                                        ? "cursor-not-allowed text-fg-3/50"
                                        : selected
                                          ? "bg-accent-muted font-medium text-accent"
                                          : "text-fg-2 hover:bg-elevated hover:text-fg",
                                    )}
                                  >
                                    <span className="min-w-0 truncate">
                                      <span className="block truncate font-medium">{p.name}</span>
                                      <span className="block font-mono text-[10px] opacity-75">
                                        {p.id}
                                        {p.linked_slug ? " · đã gắn brand khác" : ""}
                                      </span>
                                    </span>
                                    {selected && <Check size={13} className="shrink-0" />}
                                  </button>
                                );
                              })}
                            </m.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleLink(b)}
                        disabled={!choice || busy === b.slug}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-canvas hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Link2 size={13} />
                        Gắn
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && unlinkedCount > 0 && pages.length === 0 && (
        <p className="text-xs text-amber-300">
          Chưa có danh sách Fanpage nào. Bấm &quot;Lấy danh sách Fanpage mới nhất&quot; để Javis đồng bộ từ Meta.
        </p>
      )}
    </section>
  );
}
