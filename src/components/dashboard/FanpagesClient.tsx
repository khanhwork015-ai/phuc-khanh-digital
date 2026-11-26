"use client";

import { RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type FanpageItem = {
  id: string;
  code: string;
  javisClientSlug: string | null;
  pageId: string | null;
  businessName: string;
  contractStatus: string;
  accountCount: number;
  counts: {
    pending_review: number;
    pending_client: number;
    approved: number;
    changes_requested: number;
    scheduled: number;
    published: number;
    total: number;
  };
};

type FilterMode = "all" | "need_admin" | "need_client" | "no_account" | "empty";

export function FanpagesClient() {
  const [items, setItems] = useState<FanpageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  async function loadFanpages() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fanpages");
      const json = (await res.json()) as { ok?: boolean; fanpages?: FanpageItem[] };
      if (res.ok && json.ok && json.fanpages) {
        setItems(json.fanpages);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFanpages();
  }, []);

  const totalNeedAdmin = items.filter((x) => x.counts.pending_review > 0).length;
  const totalNeedClient = items.filter((x) => x.counts.pending_client > 0).length;
  const totalNoAccount = items.filter((x) => x.accountCount === 0).length;

  const filtered = items.filter((item) => {
    if (filter === "need_admin" && item.counts.pending_review === 0) return false;
    if (filter === "need_client" && item.counts.pending_client === 0) return false;
    if (filter === "no_account" && item.accountCount > 0) return false;
    if (filter === "empty" && item.counts.total > 0) return false;

    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.businessName.toLowerCase().includes(q) ||
      (item.javisClientSlug ?? "").toLowerCase().includes(q) ||
      (item.pageId ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Tổng quan Brand</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Fanpages</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadFanpages()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-medium text-fg hover:border-line-strong"
        >
          <RefreshCw size={14} />
          <span>Quét lại từ Javis</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-2xl border bg-surface/80 p-4 text-left transition-colors",
            filter === "all" ? "border-accent" : "border-line hover:border-line-strong",
          )}
        >
          <p className="font-mono text-xs text-fg-3">Tổng Fanpages</p>
          <p className="mt-1 text-2xl font-bold text-fg">{items.length}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter("need_admin")}
          className={cn(
            "rounded-2xl border bg-surface/80 p-4 text-left transition-colors",
            filter === "need_admin" ? "border-accent" : "border-line hover:border-line-strong",
          )}
        >
          <p className="font-mono text-xs text-amber-300">Cần Admin duyệt</p>
          <p className="mt-1 text-2xl font-bold text-fg">{totalNeedAdmin}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter("need_client")}
          className={cn(
            "rounded-2xl border bg-surface/80 p-4 text-left transition-colors",
            filter === "need_client" ? "border-accent" : "border-line hover:border-line-strong",
          )}
        >
          <p className="font-mono text-xs text-violet-300">Chờ khách duyệt</p>
          <p className="mt-1 text-2xl font-bold text-fg">{totalNeedClient}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter("no_account")}
          className={cn(
            "rounded-2xl border bg-surface/80 p-4 text-left transition-colors",
            filter === "no_account" ? "border-accent" : "border-line hover:border-line-strong",
          )}
        >
          <p className="font-mono text-xs text-rose-300">Chưa gắn tài khoản</p>
          <p className="mt-1 text-2xl font-bold text-fg">{totalNoAccount}</p>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên Fanpage, slug hoặc Page ID..."
            className="h-10 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "Tất cả" },
            { id: "need_admin", label: "Cần Admin duyệt" },
            { id: "need_client", label: "Chờ khách duyệt" },
            { id: "no_account", label: "Chưa gắn tài khoản" },
            { id: "empty", label: "Chưa có bài" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as FilterMode)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === tab.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg-2 hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-2">
          Đang tải danh sách Fanpages...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-fg-2">
          Không có Fanpage nào khớp bộ lọc hiện tại.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-elevated/60 font-mono text-[11px] uppercase tracking-wider text-fg-3">
                <th className="px-4 py-3">Fanpage / Brand</th>
                <th className="px-4 py-3">Chờ Admin</th>
                <th className="px-4 py-3">Chờ khách</th>
                <th className="px-4 py-3">Cần sửa</th>
                <th className="px-4 py-3">Chờ đăng</th>
                <th className="px-4 py-3">Đã đăng</th>
                <th className="px-4 py-3">Tài khoản</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((fp) => (
                <tr key={fp.id} className="transition-colors hover:bg-elevated/40">
                  <td className="px-4 py-3">
                    <Link href="/dashboard/content" className="font-semibold text-fg hover:text-accent">
                      {fp.businessName}
                    </Link>
                    <p className="font-mono text-[11px] text-fg-3">
                      {fp.javisClientSlug || fp.code}
                      {fp.pageId ? ` · ID: ${fp.pageId}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-amber-300">{fp.counts.pending_review}</td>
                  <td className="px-4 py-3 font-mono text-xs text-violet-300">{fp.counts.pending_client}</td>
                  <td className="px-4 py-3 font-mono text-xs text-rose-300">{fp.counts.changes_requested}</td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-300">
                    {fp.counts.approved + fp.counts.scheduled}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-300">{fp.counts.published}</td>
                  <td className="px-4 py-3">
                    {fp.accountCount > 0 ? (
                      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        {fp.accountCount} tài khoản
                      </span>
                    ) : (
                      <Link
                        href="/dashboard/accounts"
                        className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                      >
                        Chưa gắn
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
