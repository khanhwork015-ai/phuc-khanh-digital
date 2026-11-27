"use client";

import { ArrowRightLeft, ExternalLink, MessageCircle, Search, Trash2 } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog, type ConfirmChangeItem } from "@/components/ui/ConfirmDialog";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { leadPlanLabels, type LeadPlanValue } from "@/lib/lead-fields";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type LeadRow = {
  id: string;
  fullName: string;
  phone: string;
  fanpageUrl: string;
  plan: string;
  status: "new" | "contacting" | "converted" | "archived";
  note: string | null;
  syncedToJavis: boolean;
  convertedCustomerId: string | null;
  createdAt: string;
};

const statusOptions: Array<{ value: LeadRow["status"]; label: string }> = [
  { value: "new", label: "Mới" },
  { value: "contacting", label: "Đang tư vấn" },
  { value: "converted", label: "Đã chuyển đổi" },
  { value: "archived", label: "Lưu trữ" },
];

function buildZaloUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const normalized = digits.startsWith("+84")
    ? `0${digits.slice(3)}`
    : digits.startsWith("84") && digits.length >= 11
      ? `0${digits.slice(2)}`
      : digits.replace(/\+/g, "");
  return `https://zalo.me/${normalized}`;
}

const statusLabelMap: Record<LeadRow["status"], string> = {
  new: "Mới",
  contacting: "Đang tư vấn",
  converted: "Đã chuyển đổi",
  archived: "Lưu trữ",
};

export function LeadsClient({ canEdit = false }: { canEdit?: boolean }) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [draftStatus, setDraftStatus] = useState<LeadRow["status"]>("new");
  const [draftNote, setDraftNote] = useState("");

  const [convertingLead, setConvertingLead] = useState<LeadRow | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [javisSlug, setJavisSlug] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("0");

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "danger";
    changes?: ConfirmChangeItem[];
    requireText?: string;
    errorMessage: string | null;
    action: () => Promise<void>;
  } | null>(null);

  async function loadLeads() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      const json = (await res.json()) as { ok?: boolean; leads?: LeadRow[] };
      if (res.ok && json.ok && json.leads) {
        setLeads(json.leads);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((item) => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.fanpageUrl.toLowerCase().includes(q)
      );
    });
  }, [leads, filterStatus, search]);

  function openEditModal(lead: LeadRow) {
    setEditingLead(lead);
    setDraftStatus(lead.status);
    setDraftNote(lead.note ?? "");
  }

  function requestSaveLeadEdit() {
    if (!editingLead) return;
    const target = editingLead;
    const changes: ConfirmChangeItem[] = [];
    if (draftStatus !== target.status) {
      changes.push({
        label: "Trạng thái",
        before: statusLabelMap[target.status],
        after: statusLabelMap[draftStatus],
      });
    }
    if (draftNote !== (target.note ?? "")) {
      changes.push({
        label: "Ghi chú",
        after: draftNote.trim() || "(Trống)",
      });
    }

    setConfirmState({
      open: true,
      title: `Cập nhật Lead: ${target.fullName}`,
      description: "Xác nhận lưu thay đổi trạng thái và ghi chú tư vấn cho Lead này.",
      confirmLabel: "Lưu thay đổi",
      variant: "default",
      changes,
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/leads/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: draftStatus, note: draftNote }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string; lead?: LeadRow };
        if (!res.ok || !data.ok || !data.lead) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Lưu thất bại." } : null));
          return;
        }
        setLeads((prev) => prev.map((l) => (l.id === target.id ? data.lead! : l)));
        setEditingLead(null);
        setConfirmState(null);
      },
    });
  }

  function openConvertModal(lead: LeadRow) {
    setConvertingLead(lead);
    setBusinessName(lead.fullName);
    setJavisSlug("");
    setMonthlyFee("0");
  }

  function requestConvertLead() {
    if (!convertingLead) return;
    const target = convertingLead;
    setConfirmState({
      open: true,
      title: `Chuyển đổi Lead thành Khách hàng`,
      description: `Lead "${target.fullName}" sẽ được chuyển thành khách hàng chính thức trên hệ thống.`,
      confirmLabel: "Chuyển đổi ngay",
      variant: "default",
      changes: [
        { label: "Tên thương hiệu", after: businessName.trim() },
        { label: "Gói dịch vụ", after: leadPlanLabels[target.plan as LeadPlanValue] ?? target.plan },
        { label: "Slug Javis", after: javisSlug.trim() || "(Chưa gắn)" },
      ],
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/leads/${target.id}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: businessName.trim(),
            javisClientSlug: javisSlug.trim() || undefined,
            monthlyFee: Number(monthlyFee) || 0,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string; lead?: LeadRow };
        if (!res.ok || !data.ok || !data.lead) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Chuyển đổi thất bại." } : null));
          return;
        }
        setLeads((prev) => prev.map((l) => (l.id === target.id ? data.lead! : l)));
        setConvertingLead(null);
        setConfirmState(null);
      },
    });
  }

  function requestDeleteLead(lead: LeadRow) {
    setConfirmState({
      open: true,
      title: `Xóa vĩnh viễn Lead "${lead.fullName}"`,
      description: "Thao tác này xóa hoàn toàn bản ghi Lead khỏi cơ sở dữ liệu và không thể khôi phục.",
      confirmLabel: "Xóa vĩnh viễn",
      variant: "danger",
      requireText: lead.phone,
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Xóa thất bại." } : null));
          return;
        }
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        setConfirmState(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Khách hàng tiềm năng</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Lead từ Landing Page</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "all", label: "Tất cả" }, ...statusOptions].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                filterStatus === tab.value
                  ? "bg-accent text-canvas"
                  : "border border-line bg-surface text-fg-2 hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên, SĐT, Fanpage..."
            className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
          />
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
          Không có Lead nào phù hợp bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((lead, idx) => (
            <m.div
              key={lead.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-fg">{lead.fullName}</p>
                  <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-accent">
                    {statusLabelMap[lead.status]}
                  </span>
                </div>
                <p className="text-sm text-fg-2">
                  {lead.phone} · {leadPlanLabels[lead.plan as LeadPlanValue] ?? lead.plan}
                </p>
                {lead.fanpageUrl && (
                  <a
                    href={lead.fanpageUrl.startsWith("http") ? lead.fanpageUrl : `https://${lead.fanpageUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-accent"
                  >
                    <span className="truncate max-w-[260px]">{lead.fanpageUrl}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {lead.note && <p className="text-xs text-fg-3">Ghi chú: {lead.note}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {lead.phone && (
                  <a
                    href={buildZaloUrl(lead.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line-accent bg-accent-muted/40 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent-muted"
                  >
                    <MessageCircle size={13} />
                    <span>Nhắn Zalo</span>
                  </a>
                )}
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditModal(lead)}
                      className="inline-flex h-9 items-center rounded-xl border border-line bg-elevated px-3 text-xs font-medium text-fg hover:border-line-strong"
                    >
                      Cập nhật
                    </button>
                    {lead.status !== "converted" && (
                      <button
                        type="button"
                        onClick={() => openConvertModal(lead)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-canvas hover:bg-accent-hover"
                      >
                        <ArrowRightLeft size={13} />
                        <span>Chuyển thành Khách</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => requestDeleteLead(lead)}
                      aria-label={`Xóa lead ${lead.fullName}`}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-line text-fg-3 transition-colors hover:border-red-500/40 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </m.div>
          ))}
        </div>
      )}

      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold text-fg">Cập nhật Lead: {editingLead.fullName}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Trạng thái xử lý</label>
                <SelectDropdown
                  ariaLabel="Chọn trạng thái xử lý"
                  value={draftStatus}
                  onChange={(val) => setDraftStatus(val as LeadRow["status"])}
                  options={statusOptions}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Ghi chú tư vấn</label>
                <textarea
                  rows={3}
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="Nội dung đã trao đổi với khách..."
                  className="w-full rounded-xl border border-line bg-canvas p-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg-2 hover:text-fg"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={requestSaveLeadEdit}
                className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas hover:bg-accent-hover"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {convertingLead && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold text-fg">Chuyển đổi thành Khách hàng</h2>
            <p className="mt-1 text-xs text-fg-3">Từ Lead: {convertingLead.fullName} ({convertingLead.phone})</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Tên thương hiệu / Doanh nghiệp *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Slug thư mục trên Javis (VD: shin-aios)</label>
                <input
                  type="text"
                  value={javisSlug}
                  onChange={(e) => setJavisSlug(e.target.value)}
                  placeholder="Để trống nếu chưa tạo trên Javis"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Phí vận hành / tháng (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConvertingLead(null)}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg-2 hover:text-fg"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={businessName.trim().length < 2}
                onClick={requestConvertLead}
                className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas hover:bg-accent-hover disabled:opacity-50"
              >
                Tiếp tục xác nhận
              </button>
            </div>
          </div>
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
          changes={confirmState.changes}
          requireText={confirmState.requireText}
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
