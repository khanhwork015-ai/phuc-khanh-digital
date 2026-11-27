"use client";

import { Link2, Link2Off, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <div className="divide-y divide-line rounded-xl border border-line">
          {brands.map((b) => {
            const choice = picked[b.slug] ?? "";
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
                      <select
                        value={choice}
                        onChange={(e) => setPicked((prev) => ({ ...prev, [b.slug]: e.target.value }))}
                        aria-label={`Chọn Fanpage cho ${b.name}`}
                        className="h-10 min-w-[240px] rounded-xl border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
                      >
                        <option value="">Chọn Fanpage đã kết nối...</option>
                        {pages.map((p) => (
                          <option key={p.id} value={p.id} disabled={Boolean(p.linked_slug)}>
                            {p.name} ({p.id}){p.linked_slug ? " - đã gắn brand khác" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleLink(b)}
                        disabled={!choice || busy === b.slug}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
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
