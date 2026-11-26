"use client";

import { ExternalLink, FileText, LogOut, Palette, Sparkles } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatPostTime } from "@/components/content/FacebookPostPreview";
import { PostReviewModal, type ReviewAction } from "@/components/content/PostReviewModal";
import { Logo } from "@/components/ui/Logo";
import { leadPlanLabels, type LeadPlanValue } from "@/lib/lead-fields";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type PortalOverview = {
  customer: {
    code: string;
    businessName: string;
    fullName: string;
    plan: string;
    contractStatus: string;
    fanpageUrl: string | null;
  };
  brandAssets: Array<{
    id: string;
    title: string;
    assetType: string;
    fileUrl: string | null;
    updatedAt: string;
  }>;
  contentItems: Array<{
    id: string;
    title: string;
    caption: string;
    mediaUrls: string[];
    status: string;
    clientFeedback: string | null;
    scheduledAt: string | null;
    publishedAt: string | null;
    publishedUrl: string | null;
    fanpageName: string;
    logoUrl: string | null;
    actions: ReviewAction[];
  }>;
};

const contentStatusLabel: Record<string, string> = {
  pending_review: "Đang biên tập",
  pending_client: "Chờ bạn duyệt",
  approved: "Đã duyệt",
  changes_requested: "Đang chỉnh sửa theo góp ý",
  scheduled: "Đã lên lịch đăng",
  published: "Đã đăng",
};

export function PortalClient({ username }: { username: string }) {
  const router = useRouter();
  const [data, setData] = useState<PortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "brand">("content");
  const [contentFilter, setContentFilter] = useState<"pending" | "approved" | "published" | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadOverview(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/portal/overview", { cache: "no-store" });
      const json = (await res.json()) as PortalOverview & { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Không thể tải dữ liệu cổng khách hàng.");
        return;
      }
      setData(json);
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const counts = useMemo(() => {
    const items = data?.contentItems ?? [];
    return {
      pending: items.filter((i) => i.status === "pending_client").length,
      approved: items.filter((i) => i.status === "approved" || i.status === "scheduled").length,
      published: items.filter((i) => i.status === "published").length,
      all: items.length,
    };
  }, [data]);

  const pendingItems = useMemo(
    () => (data?.contentItems ?? []).filter((i) => i.status === "pending_client"),
    [data],
  );

  const filteredItems = useMemo(() => {
    const items = data?.contentItems ?? [];
    if (contentFilter === "pending") return items.filter((i) => i.status === "pending_client");
    if (contentFilter === "approved") return items.filter((i) => i.status === "approved" || i.status === "scheduled");
    if (contentFilter === "published") return items.filter((i) => i.status === "published");
    return pendingItems.length > 0 ? items.filter((i) => i.status !== "pending_client") : items;
  }, [data, contentFilter, pendingItems.length]);

  const selected = data?.contentItems.find((i) => i.id === selectedId) ?? null;

  async function decide(itemId: string, action: ReviewAction, feedback?: string) {
    const res = await fetch(`/api/portal/content/${itemId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, feedback }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) return { ok: false, message: json.message ?? "Thao tác thất bại." };
    setSelectedId(null);
    setNotice(
      action === "approve"
        ? "Cảm ơn bạn đã duyệt. Bài viết đã được đưa vào lịch đăng."
        : "Đã gửi yêu cầu chỉnh sửa. Đội ngũ sẽ sửa theo góp ý của bạn và gửi lại để duyệt.",
    );
    await loadOverview(true);
    return { ok: true };
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-fg-2 sm:inline">{username}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-medium text-fg-2 hover:text-fg"
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
            <div className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
          </div>
        ) : error || !data ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            {error ?? "Không có dữ liệu."}
          </div>
        ) : (
          <div className="space-y-6">
            <m.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: easeOutExpo }}
              className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-mono text-xs text-accent">{data.customer.code}</span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">{data.customer.businessName}</h1>
                  <p className="mt-1 text-sm text-fg-2">
                    {leadPlanLabels[data.customer.plan as LeadPlanValue] ?? data.customer.plan}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                  <div className="rounded-xl border border-line bg-canvas px-3 py-2">
                    <p className="text-lg font-bold text-accent">{counts.pending}</p>
                    <p className="text-[11px] text-fg-3">Chờ duyệt</p>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas px-3 py-2">
                    <p className="text-lg font-bold text-fg">{counts.approved}</p>
                    <p className="text-[11px] text-fg-3">Đã duyệt</p>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas px-3 py-2">
                    <p className="text-lg font-bold text-emerald-300">{counts.published}</p>
                    <p className="text-[11px] text-fg-3">Đã đăng</p>
                  </div>
                </div>
              </div>
            </m.section>

            {notice && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice(null)} className="text-xs text-emerald-300 hover:underline">
                  Ẩn
                </button>
              </div>
            )}

            <div className="inline-flex rounded-xl border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  activeTab === "content" ? "text-canvas" : "text-fg-2 hover:text-fg",
                )}
              >
                {activeTab === "content" && (
                  <m.span
                    layoutId="portal-tab-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-accent"
                  />
                )}
                <Sparkles size={14} className="relative z-10" />
                <span className="relative z-10">Duyệt bài viết</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("brand")}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  activeTab === "brand" ? "text-canvas" : "text-fg-2 hover:text-fg",
                )}
              >
                {activeTab === "brand" && (
                  <m.span
                    layoutId="portal-tab-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-accent"
                  />
                )}
                <Palette size={14} className="relative z-10" />
                <span className="relative z-10">Bộ nhận diện thương hiệu</span>
              </button>
            </div>

            {activeTab === "content" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: "pending" as const, label: `Chờ duyệt (${counts.pending})` },
                    { value: "approved" as const, label: `Đã duyệt (${counts.approved})` },
                    { value: "published" as const, label: `Đã đăng (${counts.published})` },
                    { value: "all" as const, label: `Tất cả (${counts.all})` },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setContentFilter(tab.value)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                        contentFilter === tab.value
                          ? "bg-accent text-canvas"
                          : "border border-line bg-surface text-fg-2 hover:text-fg",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {contentFilter === "all" && pendingItems.length > 0 && (
                  <section className="space-y-3 rounded-2xl border border-line-accent bg-accent-muted/30 p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-accent">
                        Bài đang chờ bạn duyệt ({pendingItems.length})
                      </h2>
                      <span className="text-xs text-fg-3">Ưu tiên xử lý trước giờ đăng</span>
                    </div>
                    <div className="space-y-3">
                      {pendingItems.map((item) => (
                        <PortalContentCard key={item.id} item={item} onSelect={() => setSelectedId(item.id)} />
                      ))}
                    </div>
                  </section>
                )}

                {filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
                    {contentFilter === "all"
                      ? "Hiện chưa có bài viết nào được đồng bộ lên cổng duyệt."
                      : "Không có bài viết nào trong mục này."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredItems.map((item) => (
                      <PortalContentCard key={item.id} item={item} onSelect={() => setSelectedId(item.id)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.brandAssets.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3 sm:col-span-2">
                    Bộ nhận diện thương hiệu đang được Javis hoàn thiện và sẽ hiển thị tại đây.
                  </div>
                ) : (
                  data.brandAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface/80 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-fg">{asset.title}</p>
                          <p className="font-mono text-[11px] uppercase text-fg-3">{asset.assetType}</p>
                        </div>
                      </div>
                      {asset.fileUrl && (
                        <a
                          href={asset.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1 rounded-xl border border-line px-3 text-xs font-medium text-fg-2 hover:text-fg"
                        >
                          <span>Mở</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {selected && (
        <PostReviewModal
          key={selected.id}
          title={selected.title}
          statusLabel={contentStatusLabel[selected.status] ?? selected.status}
          pageName={selected.fanpageName || data?.customer.businessName || "Fanpage"}
          logoUrl={selected.logoUrl}
          timeLabel={formatPostTime(selected.publishedAt || selected.scheduledAt)}
          caption={selected.caption}
          mediaUrls={selected.mediaUrls}
          actions={selected.actions}
          approveLabel="Duyệt bài này"
          approveHint="Sau khi bạn duyệt, Javis sẽ đưa bài vào lịch đăng chính thức trên Fanpage."
          readOnlyNote={selected.status === "published" ? "Bài đã đăng." : "Bài đang được xử lý, không cần thao tác."}
          onAction={(action, feedback) => decide(selected.id, action, feedback)}
          onClose={() => setSelectedId(null)}
          notes={
            <>
              {selected.clientFeedback && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                  <span className="font-semibold">Góp ý của bạn:</span> {selected.clientFeedback}
                </div>
              )}
              {selected.publishedUrl && (
                <a
                  href={selected.publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Xem trên Facebook <ExternalLink size={12} />
                </a>
              )}
            </>
          }
        />
      )}
    </div>
  );
}

function PortalContentCard({
  item,
  onSelect,
}: {
  item: PortalOverview["contentItems"][number];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full gap-3 rounded-2xl border border-line bg-surface/80 p-4 text-left transition-colors hover:border-line-accent sm:p-5"
    >
      {item.mediaUrls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.mediaUrls[0]} alt="" className="size-16 shrink-0 rounded-xl border border-line object-cover" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold",
              item.status === "pending_client"
                ? "border-line-accent bg-accent-muted text-accent"
                : "border-line bg-canvas text-fg-2",
            )}
          >
            {contentStatusLabel[item.status] ?? item.status}
          </span>
          <span className="font-mono text-[11px] text-fg-3">
            {formatPostTime(item.publishedAt || item.scheduledAt)}
          </span>
        </div>
        <h2 className="text-base font-semibold text-fg group-hover:text-accent">{item.title}</h2>
        <p className="line-clamp-2 text-sm text-fg-2">{item.caption}</p>
        {item.clientFeedback && (
          <p className="line-clamp-2 text-xs text-amber-300">Góp ý của bạn: {item.clientFeedback}</p>
        )}
      </div>
      <span className="hidden h-9 shrink-0 items-center rounded-xl border border-line bg-canvas px-3.5 text-xs font-medium text-fg-2 group-hover:text-accent sm:inline-flex">
        {item.actions.includes("approve") ? "Xem và duyệt" : "Xem bài"}
      </span>
    </button>
  );
}
