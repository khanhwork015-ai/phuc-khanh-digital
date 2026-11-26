"use client";

import { ExternalLink, FileText, Palette, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { m } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { brandAssetTypes, type BrandAssetType } from "@/db/types";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type BrandAssetRow = {
  id: string;
  customerId: string;
  title: string;
  assetType: BrandAssetType;
  fileUrl: string | null;
  metadata: { source?: string; relativePath?: string; content?: string | null } | null;
  updatedAt: string;
  customerName: string;
  customerSlug: string | null;
};

type CustomerOption = {
  id: string;
  code: string;
  businessName: string;
};

const assetTypeLabel: Record<BrandAssetType, string> = {
  guideline: "Hướng dẫn thương hiệu",
  image: "Logo / Hình ảnh",
  pdf: "Tài liệu PDF",
  palette: "Bảng màu & Font",
};

export function BrandAssetsClient({ canEdit = false }: { canEdit?: boolean }) {
  const [assets, setAssets] = useState<BrandAssetRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [previewAsset, setPreviewAsset] = useState<BrandAssetRow | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<BrandAssetType>("guideline");
  const [newUrl, setNewUrl] = useState("");
  const [newContent, setNewContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "danger";
    requireText?: string;
    errorMessage: string | null;
    action: () => Promise<void>;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, custRes] = await Promise.all([
        fetch("/api/admin/brand-assets", { cache: "no-store" }),
        fetch("/api/admin/customers", { cache: "no-store" }),
      ]);
      const assetsJson = (await assetsRes.json()) as { ok?: boolean; assets?: BrandAssetRow[] };
      const custJson = (await custRes.json()) as { ok?: boolean; customers?: CustomerOption[] };
      if (assetsRes.ok && assetsJson.ok && assetsJson.assets) setAssets(assetsJson.assets);
      if (custRes.ok && custJson.ok && custJson.customers) setCustomers(custJson.customers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filtered = useMemo(
    () => (customerFilter === "all" ? assets : assets.filter((a) => a.customerId === customerFilter)),
    [assets, customerFilter],
  );

  function requestCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!newCustomerId || newTitle.trim().length < 2) {
      setFormError("Vui lòng chọn khách hàng và nhập tên tài liệu.");
      return;
    }

    const chosen = customers.find((c) => c.id === newCustomerId);
    setConfirmState({
      open: true,
      title: `Thêm tài liệu nhận diện cho ${chosen?.businessName ?? "khách hàng"}`,
      description: `Tài liệu "${newTitle.trim()}" sẽ hiển thị cho cả Admin và khách hàng trên Portal.`,
      confirmLabel: "Lưu tài liệu",
      variant: "default",
      errorMessage: null,
      action: async () => {
        const res = await fetch("/api/admin/brand-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: newCustomerId,
            title: newTitle.trim(),
            assetType: newType,
            fileUrl: newUrl.trim(),
            content: newContent.trim(),
          }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Lưu thất bại." } : null));
          return;
        }
        setShowCreate(false);
        setNewTitle("");
        setNewUrl("");
        setNewContent("");
        setConfirmState(null);
        await loadAll();
      },
    });
  }

  function requestDeleteAsset(asset: BrandAssetRow) {
    setConfirmState({
      open: true,
      title: `Xóa tài liệu "${asset.title}"`,
      description: "Tài liệu này sẽ bị xóa khỏi danh sách Bộ nhận diện thương hiệu trên Dashboard và Portal.",
      confirmLabel: "Xóa vĩnh viễn",
      variant: "danger",
      requireText: asset.title,
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/brand-assets/${asset.id}`, { method: "DELETE" });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Xóa thất bại." } : null));
          return;
        }
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        setConfirmState(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Thư viện thương hiệu</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Bộ nhận diện thương hiệu</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-medium text-fg hover:border-line-strong"
          >
            <RefreshCw size={14} />
            <span>Quét từ Javis</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowCreate(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas hover:bg-accent-hover"
            >
              <Plus size={16} />
              <span>Thêm tài liệu</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/60 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCustomerFilter("all")}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
              customerFilter === "all"
                ? "border-line-strong bg-elevated text-fg"
                : "border-transparent bg-canvas/50 text-fg-3 hover:border-line hover:bg-canvas hover:text-fg",
            )}
          >
            Tất cả khách <span className="font-mono opacity-75">({assets.length})</span>
          </button>
          {customers.map((c) => {
            const count = assets.filter((a) => a.customerId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCustomerFilter(c.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                  customerFilter === c.id
                    ? "border-line-accent bg-accent-muted text-accent"
                    : "border-transparent bg-canvas/50 text-fg-2 hover:border-line hover:bg-canvas hover:text-fg",
                )}
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-accent">
                  {c.businessName.charAt(0).toUpperCase()}
                </span>
                <span>{c.businessName}</span>
                <span className="font-mono opacity-75">{count}</span>
              </button>
            );
          })}
        </div>

        <SelectDropdown
          size="sm"
          ariaLabel="Lọc theo khách hàng"
          value={customerFilter}
          onChange={setCustomerFilter}
          className="sm:w-56"
          menuClassName="left-auto right-0"
          options={[
            { value: "all", label: "Tất cả khách", count: assets.length },
            ...customers.map((c) => ({
              value: c.id,
              label: c.businessName,
              avatarText: c.businessName.charAt(0).toUpperCase(),
              count: assets.filter((a) => a.customerId === c.id).length,
            })),
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
          Chưa có tài liệu Bộ nhận diện thương hiệu nào cho khách hàng này.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((asset, idx) => (
            <m.div
              key={asset.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface/80 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                {asset.assetType === "image" && asset.fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.fileUrl}
                    alt={asset.title}
                    className="size-12 shrink-0 rounded-xl border border-line bg-white object-cover"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    {asset.assetType === "palette" ? <Palette size={20} /> : <FileText size={20} />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-accent">{asset.customerName}</span>
                    <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-[10px] text-fg-3">
                      {assetTypeLabel[asset.assetType] ?? asset.assetType}
                    </span>
                  </div>
                  <h2 className="mt-1 truncate text-base font-semibold text-fg">{asset.title}</h2>
                  {asset.metadata?.relativePath && (
                    <p className="truncate font-mono text-[11px] text-fg-3">{asset.metadata.relativePath}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                {asset.metadata?.content && (
                  <button
                    type="button"
                    onClick={() => setPreviewAsset(asset)}
                    className="inline-flex h-8 items-center rounded-lg border border-line bg-canvas px-3 text-xs font-medium text-fg hover:border-line-accent hover:text-accent"
                  >
                    Xem nội dung
                  </button>
                )}
                {asset.fileUrl && (
                  <a
                    href={asset.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-canvas px-3 text-xs font-medium text-fg-2 hover:text-fg"
                  >
                    <span>Mở tệp</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => requestDeleteAsset(asset)}
                    aria-label={`Xóa ${asset.title}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-fg-3 transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </m.div>
          ))}
        </div>
      )}

      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <span className="font-mono text-xs text-accent">{previewAsset.customerName}</span>
                <h2 className="mt-0.5 text-base font-semibold text-fg">{previewAsset.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                aria-label="Đóng"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-fg-2 hover:text-fg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg-2">
                {previewAsset.metadata?.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {showCreate && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={requestCreateAsset}
            className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6"
          >
            <h2 className="text-lg font-semibold text-fg">Thêm tài liệu Nhận diện</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Khách hàng *</label>
                <SelectDropdown
                  ariaLabel="Chọn khách hàng"
                  value={newCustomerId}
                  onChange={setNewCustomerId}
                  placeholder="-- Chọn khách hàng --"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.code} - ${c.businessName}`,
                    avatarText: c.businessName.charAt(0).toUpperCase(),
                  }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Loại tài liệu</label>
                <SelectDropdown
                  ariaLabel="Chọn loại tài liệu"
                  value={newType}
                  onChange={(v) => setNewType(v as BrandAssetType)}
                  options={brandAssetTypes.map((t) => ({ value: t, label: assetTypeLabel[t] }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Tên tài liệu *</label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Brand Guideline v1, Logo chính thức..."
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Đường dẫn tệp / Link (nếu có)</label>
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://... hoặc /api/local-media?path=..."
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Nội dung mô tả / Quy chuẩn (tuỳ chọn)</label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Mã màu, font chữ, giọng văn thương hiệu..."
                  className="w-full rounded-xl border border-line bg-canvas p-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {formError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg-2 hover:text-fg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas hover:bg-accent-hover"
              >
                Tiếp tục xác nhận
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.action}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          variant={confirmState.variant}
          requireText={confirmState.requireText}
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
