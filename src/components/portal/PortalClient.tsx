"use client";

import { ExternalLink, LogOut, Palette, Sparkles } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatPostTime } from "@/components/content/FacebookPostPreview";
import { PostReviewModal, type ReviewAction } from "@/components/content/PostReviewModal";
import { BrandKitSummary } from "@/components/ui/BrandKitSummary";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
    metadata?: {
      content?: string | null;
      relativePath?: string;
      colors?: string[];
      hotline?: string | null;
      address?: string | null;
      pronouns?: string | null;
      tone?: string | null;
      style?: string | null;
      avoidWords?: string[];
      pricingLines?: Array<{ name: string; price: string }>;
    } | null;
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
  internalReadyCount?: number;
  fanpageConnected?: boolean;
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

  async function decide(itemId: string, action: ReviewAction, feedback?: string) {
    const res = await fetch(`/api/portal/content/${itemId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, feedback }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) return { ok: false, message: json.message ?? "Thao tác thất bại." };
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
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
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
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:gap-3">
                  <div className="rounded-xl border border-line bg-canvas px-3 py-2">
                    <p className="text-lg font-bold text-accent">{counts.pending}</p>
                    <p className="text-[11px] text-fg-3">Chờ bạn duyệt</p>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas px-3 py-2">
                    <p className="text-lg font-bold text-sky-300">{data.internalReadyCount ?? 0}</p>
                    <p className="text-[11px] text-fg-3">Sẵn sàng chờ chuyển</p>
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
                <span className="relative z-10">Brand Kit</span>
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

                {(data.internalReadyCount ?? 0) > 0 && (
                  <div className="rounded-2xl border border-line bg-surface/80 px-4 py-3 text-xs text-fg-2 sm:text-sm">
                    Hiện có <span className="font-semibold text-accent">{data.internalReadyCount} bài viết</span> đang sẵn sàng ở nội bộ và sẽ sớm được đội ngũ chuyển sang mục{" "}
                    <span className="font-medium text-fg">Chờ bạn duyệt</span>.
                  </div>
                )}

                {data.fanpageConnected === false && (
                  <div className="rounded-2xl border border-line-accent bg-accent-muted/20 px-4 py-3 text-xs text-fg-2 sm:text-sm">
                    <span className="font-semibold text-accent">Chế độ xem bài mẫu (Demo):</span> Fanpage chưa kết nối nên bạn chỉ xem trước bài viết và gửi{" "}
                    <span className="font-medium text-fg">Yêu cầu sửa</span> nếu cần, chưa cần bấm duyệt đăng.
                  </div>
                )}

                {contentFilter === "all" && pendingItems.length > 0 && (
                  <section className="space-y-4 rounded-2xl border border-line-accent bg-accent-muted/20 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-accent">
                        {data.fanpageConnected === false
                          ? `Bài mẫu demo (${pendingItems.length})`
                          : `Bài đang chờ bạn duyệt (${pendingItems.length})`}
                      </h2>
                      <span className="text-xs text-fg-3">
                        {data.fanpageConnected === false ? "Xem trước và góp ý chỉnh sửa" : "Ưu tiên xử lý trước giờ đăng"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {pendingItems.map((item) => (
                        <PostReviewModal
                          key={item.id}
                          inline
                          title={item.title}
                          statusLabel={
                            data.fanpageConnected === false && item.status === "pending_client"
                              ? "Bài mẫu demo"
                              : contentStatusLabel[item.status] ?? item.status
                          }
                          pageName={item.fanpageName || data.customer.businessName || "Fanpage"}
                          logoUrl={item.logoUrl}
                          timeLabel={formatPostTime(item.publishedAt || item.scheduledAt)}
                          caption={item.caption}
                          mediaUrls={item.mediaUrls}
                          actions={item.actions}
                          approveLabel="Duyệt bài này"
                          approveHint="Sau khi bạn duyệt, Javis sẽ đưa bài vào lịch đăng chính thức trên Fanpage."
                          readOnlyNote="Bài đang được xử lý, không cần thao tác."
                          onAction={(action, feedback) => decide(item.id, action, feedback)}
                          notes={
                            item.clientFeedback ? (
                              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300">
                                <span className="font-semibold">Góp ý của bạn:</span> {item.clientFeedback}
                              </div>
                            ) : undefined
                          }
                        />
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
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {filteredItems.map((item) => (
                      <PostReviewModal
                        key={item.id}
                        inline
                        title={item.title}
                        statusLabel={contentStatusLabel[item.status] ?? item.status}
                        pageName={item.fanpageName || data.customer.businessName || "Fanpage"}
                        logoUrl={item.logoUrl}
                        timeLabel={formatPostTime(item.publishedAt || item.scheduledAt)}
                        caption={item.caption}
                        mediaUrls={item.mediaUrls}
                        actions={item.actions}
                        approveLabel="Duyệt bài này"
                        approveHint="Sau khi bạn duyệt, Javis sẽ đưa bài vào lịch đăng chính thức trên Fanpage."
                        readOnlyNote={item.status === "published" ? "Bài đã đăng." : "Bài đang được xử lý, không cần thao tác."}
                        onAction={(action, feedback) => decide(item.id, action, feedback)}
                        notes={
                          <>
                            {item.clientFeedback && (
                              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300">
                                <span className="font-semibold">Góp ý của bạn:</span> {item.clientFeedback}
                              </div>
                            )}
                            {item.publishedUrl && (
                              <a
                                href={item.publishedUrl}
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
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <BrandKitSummary
                  brandName={data.customer.businessName}
                  brandCode={data.customer.code}
                  logoUrl={
                    data.brandAssets.find((a) => a.assetType === "image" && a.fileUrl)?.fileUrl ??
                    data.contentItems.find((i) => i.logoUrl)?.logoUrl ??
                    null
                  }
                  logoLabel={data.brandAssets.find((a) => a.assetType === "image" && a.fileUrl)?.title ?? null}
                  hotline={data.brandAssets.find((a) => a.metadata?.hotline)?.metadata?.hotline ?? null}
                  address={data.brandAssets.find((a) => a.metadata?.address)?.metadata?.address ?? null}
                  pronouns={data.brandAssets.find((a) => a.metadata?.pronouns)?.metadata?.pronouns ?? null}
                  tone={data.brandAssets.find((a) => a.metadata?.tone)?.metadata?.tone ?? null}
                  style={data.brandAssets.find((a) => a.metadata?.style)?.metadata?.style ?? null}
                  avoidWords={Array.from(new Set(data.brandAssets.flatMap((a) => a.metadata?.avoidWords ?? [])))}
                  pricingLines={
                    data.brandAssets.find((a) => (a.metadata?.pricingLines?.length ?? 0) > 0)?.metadata
                      ?.pricingLines ?? []
                  }
                  colors={Array.from(new Set(data.brandAssets.flatMap((a) => a.metadata?.colors ?? [])))}
                />
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
