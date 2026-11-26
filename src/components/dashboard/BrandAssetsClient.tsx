"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandKitSummary } from "@/components/ui/BrandKitSummary";
import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import type { BrandAssetType } from "@/db/types";
import { cn } from "@/lib/utils";

type PricingLine = {
  name: string;
  price: string;
};

type BrandAssetRow = {
  id: string;
  customerId: string;
  title: string;
  assetType: BrandAssetType;
  fileUrl: string | null;
  metadata: {
    source?: string;
    relativePath?: string;
    content?: string | null;
    colors?: string[];
    hotline?: string | null;
    address?: string | null;
    pronouns?: string | null;
    tone?: string | null;
    style?: string | null;
    avoidWords?: string[];
    pricingLines?: PricingLine[];
  } | null;
  updatedAt: string;
  customerName: string;
  customerSlug: string | null;
};

type CustomerOption = {
  id: string;
  code: string;
  businessName: string;
  phone?: string;
};

type BrandProfileSummaryItem = {
  customerId: string;
  brandName: string;
  brandCode: string;
  logoAssetId: string | null;
  guidelineAssetId: string | null;
  logoUrl: string | null;
  logoLabel: string | null;
  hotline: string | null;
  address: string | null;
  pronouns: string | null;
  tone: string | null;
  style: string | null;
  avoidWords: string[];
  pricingLines: PricingLine[];
  colors: string[];
};

function parsePricingText(text: string): PricingLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("|");
      if (idx === -1) return { name: line, price: "Liên hệ" };
      const name = line.slice(0, idx).trim();
      const price = line.slice(idx + 1).trim();
      return { name: name || line, price: price || "Liên hệ" };
    });
}

function formatPricingText(lines: PricingLine[]): string {
  return lines.map((item) => `${item.name} | ${item.price}`).join("\n");
}

function parsePreviewHexColors(input: string): string[] {
  const matches = input.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
  return Array.from(new Set(matches.map((c) => c.toUpperCase()))).slice(0, 8);
}

export function BrandAssetsClient({ canEdit = false }: { canEdit?: boolean }) {
  const [assets, setAssets] = useState<BrandAssetRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const [editingSummary, setEditingSummary] = useState<BrandProfileSummaryItem | null>(null);
  const [colorsText, setColorsText] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [tone, setTone] = useState("");
  const [style, setStyle] = useState("");
  const [avoidWordsText, setAvoidWordsText] = useState("");
  const [hotline, setHotline] = useState("");
  const [address, setAddress] = useState("");
  const [pricingText, setPricingText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoLabel, setLogoLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
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

  const brandSummaries = useMemo<BrandProfileSummaryItem[]>(() => {
    const targetCustomers =
      customerFilter === "all" ? customers : customers.filter((c) => c.id === customerFilter);

    return targetCustomers.map((customer) => {
      const customerAssets = assets.filter((a) => a.customerId === customer.id);
      const logoAsset = customerAssets.find((a) => a.assetType === "image" && a.fileUrl) ?? customerAssets.find((a) => a.assetType === "image");
      const guidelineAsset =
        customerAssets.find((a) => a.assetType === "guideline") ??
        customerAssets.find((a) => a.assetType !== "image");
      const allColors = Array.from(new Set(customerAssets.flatMap((a) => a.metadata?.colors ?? [])));
      const pricingLines =
        customerAssets.find((a) => (a.metadata?.pricingLines?.length ?? 0) > 0)?.metadata?.pricingLines ?? [];

      return {
        customerId: customer.id,
        brandName: customer.businessName,
        brandCode: customer.code,
        logoAssetId: logoAsset?.id ?? null,
        guidelineAssetId: guidelineAsset?.id ?? null,
        logoUrl: logoAsset?.fileUrl ?? null,
        logoLabel: logoAsset?.title ?? null,
        hotline:
          customerAssets.find((a) => a.metadata?.hotline)?.metadata?.hotline ??
          (customer.phone && customer.phone !== "Chưa cập nhật" ? customer.phone : null),
        address: customerAssets.find((a) => a.metadata?.address)?.metadata?.address ?? null,
        pronouns: customerAssets.find((a) => a.metadata?.pronouns)?.metadata?.pronouns ?? null,
        tone: customerAssets.find((a) => a.metadata?.tone)?.metadata?.tone ?? null,
        style: customerAssets.find((a) => a.metadata?.style)?.metadata?.style ?? null,
        avoidWords: Array.from(new Set(customerAssets.flatMap((a) => a.metadata?.avoidWords ?? []))),
        pricingLines,
        colors: allColors,
      };
    });
  }, [customers, customerFilter, assets]);

  function openEditModal(summary: BrandProfileSummaryItem) {
    setEditingSummary(summary);
    setColorsText(summary.colors.join(", "));
    setPronouns(summary.pronouns ?? "");
    setTone(summary.tone ?? "");
    setStyle(summary.style ?? "");
    setAvoidWordsText(summary.avoidWords.join(", "));
    setHotline(summary.hotline ?? "");
    setAddress(summary.address ?? "");
    setPricingText(formatPricingText(summary.pricingLines));
    setLogoUrl(summary.logoUrl ?? "");
    setLogoLabel(summary.logoLabel ?? "");
    setFormError(null);
  }

  function requestSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSummary) return;
    setFormError(null);

    const target = editingSummary;
    const parsedPricing = parsePricingText(pricingText);

    setConfirmState({
      open: true,
      title: `Lưu hồ sơ Brand Kit · ${target.brandName}`,
      description: "Các thay đổi về bảng màu, xưng hô, giọng văn, từ cần tránh và logo sẽ cập nhật đồng bộ cho Admin và Portal.",
      confirmLabel: "Lưu thay đổi",
      errorMessage: null,
      action: async () => {
        const profilePayload = {
          colorsText: colorsText.trim(),
          pronouns: pronouns.trim(),
          tone: tone.trim(),
          style: style.trim(),
          avoidWordsText: avoidWordsText.trim(),
          hotline: hotline.trim(),
          address: address.trim(),
          pricingLines: parsedPricing,
        };

        if (target.guidelineAssetId) {
          const res = await fetch(`/api/admin/brand-assets/${target.guidelineAssetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profilePayload),
          });
          const data = (await res.json()) as { ok?: boolean; message?: string };
          if (!res.ok || !data.ok) {
            setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Cập nhật hồ sơ thất bại." } : null));
            return;
          }
        } else {
          const res = await fetch("/api/admin/brand-assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: target.customerId,
              title: "Hồ sơ thương hiệu",
              assetType: "guideline",
              ...profilePayload,
            }),
          });
          const data = (await res.json()) as { ok?: boolean; message?: string };
          if (!res.ok || !data.ok) {
            setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Tạo hồ sơ thất bại." } : null));
            return;
          }
        }

        const trimmedLogoUrl = logoUrl.trim();
        const trimmedLogoLabel = logoLabel.trim() || `${target.brandName} logo`;

        if (target.logoAssetId) {
          const logoRes = await fetch(`/api/admin/brand-assets/${target.logoAssetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: trimmedLogoLabel,
              fileUrl: trimmedLogoUrl,
            }),
          });
          const logoData = (await logoRes.json()) as { ok?: boolean; message?: string };
          if (!logoRes.ok || !logoData.ok) {
            setConfirmState((prev) => (prev ? { ...prev, errorMessage: logoData.message ?? "Cập nhật logo thất bại." } : null));
            return;
          }
        } else if (trimmedLogoUrl) {
          const logoRes = await fetch("/api/admin/brand-assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: target.customerId,
              title: trimmedLogoLabel,
              assetType: "image",
              fileUrl: trimmedLogoUrl,
            }),
          });
          const logoData = (await logoRes.json()) as { ok?: boolean; message?: string };
          if (!logoRes.ok || !logoData.ok) {
            setConfirmState((prev) => (prev ? { ...prev, errorMessage: logoData.message ?? "Lưu logo thất bại." } : null));
            return;
          }
        }

        setEditingSummary(null);
        setConfirmState(null);
        await loadAll();
      },
    });
  }

  const previewColors = useMemo(() => parsePreviewHexColors(colorsText), [colorsText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Thư viện thương hiệu</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Brand Kit</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-medium text-fg hover:border-line-strong"
        >
          <RefreshCw size={14} />
          <span>Quét từ Javis</span>
        </button>
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
            Tất cả khách <span className="font-mono opacity-75">({customers.length})</span>
          </button>
          {customers.map((c) => (
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
            </button>
          ))}
        </div>

        <SelectDropdown
          size="sm"
          ariaLabel="Lọc theo khách hàng"
          value={customerFilter}
          onChange={setCustomerFilter}
          className="sm:w-56"
          menuClassName="left-auto right-0"
          options={[
            { value: "all", label: "Tất cả khách", count: customers.length },
            ...customers.map((c) => ({
              value: c.id,
              label: c.businessName,
              avatarText: c.businessName.charAt(0).toUpperCase(),
            })),
          ]}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
        </div>
      ) : brandSummaries.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
          Chưa có khách hàng nào để hiển thị Brand Kit.
        </div>
      ) : (
        <div className="space-y-4">
          {brandSummaries.map((summary) => (
            <BrandKitSummary
              key={summary.customerId}
              brandName={summary.brandName}
              brandCode={summary.brandCode}
              logoUrl={summary.logoUrl}
              logoLabel={summary.logoLabel}
              hotline={summary.hotline}
              address={summary.address}
              pronouns={summary.pronouns}
              tone={summary.tone}
              style={summary.style}
              avoidWords={summary.avoidWords}
              pricingLines={summary.pricingLines}
              colors={summary.colors}
              onEdit={canEdit ? () => openEditModal(summary) : undefined}
            />
          ))}
        </div>
      )}

      {editingSummary && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={requestSaveProfile}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                  {editingSummary.brandCode}
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-fg">
                  Chỉnh sửa Brand Kit · {editingSummary.brandName}
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">
                  Bảng màu (mã hex, cách nhau dấu phẩy)
                </label>
                <input
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  placeholder="#7CC4FA, #F8FAFC, #1E3A5F"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 font-mono text-xs text-fg focus:border-accent focus:outline-none"
                />
                {previewColors.length > 0 && (
                  <div className="mt-2">
                    <ColorSwatches colors={previewColors} />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Xưng hô</label>
                <input
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder='VD: Gọi mình là "tiệm", gọi khách là "bạn"'
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Giọng văn</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="VD: Gần gũi, chuyên nghiệp"
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Phong cách</label>
                  <input
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="VD: Tối giản, hiện đại"
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">
                  Từ cần tránh (cách nhau dấu phẩy)
                </label>
                <input
                  value={avoidWordsText}
                  onChange={(e) => setAvoidWordsText(e.target.value)}
                  placeholder="VD: rẻ nhất, cam kết 100%, siêu phẩm"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Hotline / SĐT</label>
                  <input
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    placeholder="VD: 0909 123 456"
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Địa chỉ</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: Quận 1, TP.HCM"
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">
                  Bảng giá (mỗi dòng theo mẫu: Tên dịch vụ | Giá)
                </label>
                <textarea
                  rows={3}
                  value={pricingText}
                  onChange={(e) => setPricingText(e.target.value)}
                  placeholder={"Bánh mì bơ tỏi | 25.000đ\nCombo 5 ổ | 110.000đ"}
                  className="w-full rounded-xl border border-line bg-canvas p-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Tên tệp Logo gốc</label>
                  <input
                    value={logoLabel}
                    onChange={(e) => setLogoLabel(e.target.value)}
                    placeholder="VD: shin aios logo"
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Link tệp Logo gốc</label>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="/api/local-media?path=... hoặc https://..."
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
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
                onClick={() => setEditingSummary(null)}
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
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
