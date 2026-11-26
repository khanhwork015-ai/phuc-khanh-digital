"use client";

import { CheckCircle2, ExternalLink, FileText, LogOut, MessageSquareWarning, Palette, Sparkles } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
    mediaType: string;
    mediaUrls: string[];
    status: string;
    clientFeedback: string | null;
    scheduledAt: string | null;
    publishedAt: string | null;
    publishedUrl: string | null;
  }>;
};

const contentStatusLabel: Record<string, string> = {
  pending_review: "Đang biên tập",
  pending_client: "Chờ bạn duyệt",
  approved: "Đã duyệt",
  changes_requested: "Đang chỉnh sửa",
  scheduled: "Đã lên lịch",
  published: "Đã đăng",
};

export function PortalClient({ username }: { username: string }) {
  const router = useRouter();
  const [data, setData] = useState<PortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "brand">("content");
  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    errorMessage: string | null;
    action: () => Promise<void>;
  } | null>(null);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/overview");
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
    };
  }, [data]);

  function requestApprove(itemId: string, title: string) {
    setConfirmState({
      open: true,
      title: `Duyệt bài viết "${title}"`,
      description: "Sau khi duyệt, đội ngũ Phúc Khánh Digital sẽ đưa bài viết vào lịch đăng chính thức trên Fanpage.",
      confirmLabel: "Duyệt bài viết",
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/portal/content/${itemId}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "approved" }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          item?: PortalOverview["contentItems"][number];
        };
        if (!res.ok || !json.ok || !json.item) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: json.message ?? "Gửi duyệt thất bại." } : null));
          return;
        }
        setData((prev) =>
          prev
            ? { ...prev, contentItems: prev.contentItems.map((i) => (i.id === itemId ? json.item! : i)) }
            : null,
        );
        setConfirmState(null);
      },
    });
  }

  function requestChanges(itemId: string, title: string) {
    if (feedbackText.trim().length < 3) return;
    const feedback = feedbackText.trim();
    setConfirmState({
      open: true,
      title: `Gửi yêu cầu chỉnh sửa "${title}"`,
      description: `Nội dung góp ý: "${feedback}"`,
      confirmLabel: "Gửi yêu cầu sửa",
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/portal/content/${itemId}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "changes_requested", clientFeedback: feedback }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          item?: PortalOverview["contentItems"][number];
        };
        if (!res.ok || !json.ok || !json.item) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: json.message ?? "Gửi yêu cầu thất bại." } : null));
          return;
        }
        setData((prev) =>
          prev
            ? { ...prev, contentItems: prev.contentItems.map((i) => (i.id === itemId ? json.item! : i)) }
            : null,
        );
        setFeedbackTargetId(null);
        setFeedbackText("");
        setConfirmState(null);
      },
    });
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
              <div className="space-y-4">
                {data.contentItems.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
                    Hiện chưa có bài viết nào được đồng bộ lên cổng duyệt.
                  </div>
                ) : (
                  data.contentItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-line bg-surface/80 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-fg">{item.title}</h2>
                        <span className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-accent">
                          {contentStatusLabel[item.status] ?? item.status}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-2">{item.caption}</p>

                      {item.mediaUrls.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {item.mediaUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative overflow-hidden rounded-xl border border-line bg-canvas"
                            >
                              <img src={url} alt={item.title} className="h-36 w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}

                      {item.clientFeedback && (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          Góp ý của bạn: {item.clientFeedback}
                        </div>
                      )}

                      {item.status === "pending_client" && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                          <button
                            type="button"
                            onClick={() => requestApprove(item.id, item.title)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-canvas hover:bg-accent-hover"
                          >
                            <CheckCircle2 size={14} />
                            <span>Duyệt bài này</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackTargetId(item.id);
                              setFeedbackText("");
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-elevated px-4 text-xs font-medium text-fg hover:border-line-strong"
                          >
                            <MessageSquareWarning size={14} />
                            <span>Yêu cầu chỉnh sửa</span>
                          </button>
                        </div>
                      )}

                      {feedbackTargetId === item.id && (
                        <div className="mt-3 space-y-2 rounded-xl border border-line bg-canvas p-3">
                          <textarea
                            rows={2}
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Nhập điểm bạn muốn đội ngũ chỉnh sửa..."
                            className="w-full rounded-lg border border-line bg-surface p-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setFeedbackTargetId(null)}
                              className="h-8 rounded-lg border border-line px-3 text-xs text-fg-2"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              disabled={feedbackText.trim().length < 3}
                              onClick={() => requestChanges(item.id, item.title)}
                              className="h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-canvas disabled:opacity-50"
                            >
                              Gửi góp ý
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
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

      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.action}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
