"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog, type ConfirmChangeItem } from "@/components/ui/ConfirmDialog";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { leadPlanLabels, leadPlanValues, type LeadPlanValue } from "@/lib/lead-fields";
import { easeOutExpo } from "@/lib/theme";

type CustomerRow = {
  id: string;
  code: string;
  javisClientSlug: string | null;
  fullName: string;
  businessName: string;
  phone: string;
  email: string | null;
  fanpageUrl: string | null;
  plan: LeadPlanValue;
  source: "online_lead" | "offline_contract";
  contractStatus: "active" | "paused" | "completed";
  monthlyFee: number;
  notes: string | null;
};

type CustomerFormState = {
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  fanpageUrl: string;
  plan: LeadPlanValue;
  source: "online_lead" | "offline_contract";
  contractStatus: "active" | "paused" | "completed";
  monthlyFee: string;
  javisClientSlug: string;
  notes: string;
};

const emptyForm: CustomerFormState = {
  fullName: "",
  businessName: "",
  phone: "",
  email: "",
  fanpageUrl: "",
  plan: "standard",
  source: "offline_contract",
  contractStatus: "active",
  monthlyFee: "0",
  javisClientSlug: "",
  notes: "",
};

const contractStatusLabel: Record<CustomerRow["contractStatus"], string> = {
  active: "Đang vận hành",
  paused: "Tạm dừng",
  completed: "Đã hoàn thành",
};

export function CustomersClient({ canEdit = false }: { canEdit?: boolean }) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

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

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const json = (await res.json()) as { ok?: boolean; customers?: CustomerRow[] };
      if (res.ok && json.ok && json.customers) {
        setCustomers(json.customers);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.businessName.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.javisClientSlug ?? "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  function openCreateModal() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  }

  function openEditModal(customer: CustomerRow) {
    setEditingCustomer(customer);
    setForm({
      fullName: customer.fullName,
      businessName: customer.businessName,
      phone: customer.phone,
      email: customer.email ?? "",
      fanpageUrl: customer.fanpageUrl ?? "",
      plan: customer.plan,
      source: customer.source,
      contractStatus: customer.contractStatus,
      monthlyFee: String(customer.monthlyFee),
      javisClientSlug: customer.javisClientSlug ?? "",
      notes: customer.notes ?? "",
    });
    setFormError(null);
    setModalMode("edit");
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.fullName.trim().length < 2 || form.businessName.trim().length < 2 || form.phone.trim().length < 8) {
      setFormError("Vui lòng nhập đầy đủ họ tên, tên thương hiệu và số điện thoại hợp lệ.");
      return;
    }

    const payload = {
      ...form,
      monthlyFee: Number(form.monthlyFee) || 0,
    };

    if (modalMode === "create") {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; customer?: CustomerRow };
      if (!res.ok || !data.ok || !data.customer) {
        setFormError(data.message ?? "Không thể thêm khách hàng.");
        return;
      }
      setCustomers((prev) => [data.customer!, ...prev]);
      setModalMode(null);
      return;
    }

    if (modalMode === "edit" && editingCustomer) {
      const target = editingCustomer;
      const changes: ConfirmChangeItem[] = [];
      if (form.businessName !== target.businessName) {
        changes.push({ label: "Thương hiệu", before: target.businessName, after: form.businessName });
      }
      if (form.plan !== target.plan) {
        changes.push({
          label: "Gói",
          before: leadPlanLabels[target.plan],
          after: leadPlanLabels[form.plan],
        });
      }
      if (form.contractStatus !== target.contractStatus) {
        changes.push({
          label: "Trạng thái",
          before: contractStatusLabel[target.contractStatus],
          after: contractStatusLabel[form.contractStatus],
        });
      }
      if (form.javisClientSlug !== (target.javisClientSlug ?? "")) {
        changes.push({
          label: "Slug Javis",
          before: target.javisClientSlug ?? "(Trống)",
          after: form.javisClientSlug || "(Trống)",
        });
      }

      setConfirmState({
        open: true,
        title: `Lưu thay đổi: ${target.businessName}`,
        description: "Xác nhận cập nhật thông tin hợp đồng và cấu hình đồng bộ cho khách hàng này.",
        confirmLabel: "Lưu thay đổi",
        variant: "default",
        changes,
        errorMessage: null,
        action: async () => {
          const res = await fetch(`/api/admin/customers/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json()) as { ok?: boolean; message?: string; customer?: CustomerRow };
          if (!res.ok || !data.ok || !data.customer) {
            setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Cập nhật thất bại." } : null));
            return;
          }
          setCustomers((prev) => prev.map((c) => (c.id === target.id ? data.customer! : c)));
          setModalMode(null);
          setConfirmState(null);
        },
      });
    }
  }

  function requestDeleteCustomer(customer: CustomerRow) {
    setConfirmState({
      open: true,
      title: `Xóa khách hàng "${customer.businessName}"`,
      description:
        "Thao tác này xóa vĩnh viễn hồ sơ khách hàng cùng toàn bộ bài viết duyệt và bộ nhận diện đã đồng bộ.",
      confirmLabel: "Xóa vĩnh viễn",
      variant: "danger",
      requireText: customer.code,
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/customers/${customer.id}`, { method: "DELETE" });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Xóa thất bại." } : null));
          return;
        }
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        setConfirmState(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Hồ sơ đối tác</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Quản lý Khách hàng</h1>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} />
            <span>Thêm khách (Offline / Mới)</span>
          </button>
        )}
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm thương hiệu, mã PKD, SĐT, slug Javis..."
          className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
          Chưa có khách hàng nào. Bạn có thể thêm khách ký hợp đồng offline hoặc chuyển đổi từ Lead.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((c, idx) => (
            <m.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-accent">{c.code}</span>
                  <p className="text-base font-semibold text-fg">{c.businessName}</p>
                  <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-fg-2">
                    {contractStatusLabel[c.contractStatus]}
                  </span>
                </div>
                <p className="text-sm text-fg-2">
                  {c.fullName} · {c.phone} · {leadPlanLabels[c.plan] ?? c.plan}
                </p>
                <p className="text-xs text-fg-3">
                  Nguồn: {c.source === "online_lead" ? "Lead Online" : "Hợp đồng Offline"}
                  {c.javisClientSlug ? ` · Javis slug: ${c.javisClientSlug}` : " · Chưa gắn Javis slug"}
                </p>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-elevated px-3 text-xs font-medium text-fg hover:border-line-strong"
                  >
                    <Pencil size={13} />
                    <span>Chỉnh sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteCustomer(c)}
                    aria-label={`Xóa khách hàng ${c.businessName}`}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-line text-fg-3 transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </m.div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={handleFormSubmit}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6"
          >
            <h2 className="text-lg font-semibold text-fg">
              {modalMode === "create" ? "Thêm khách hàng mới" : `Chỉnh sửa: ${editingCustomer?.businessName}`}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Tên thương hiệu *</label>
                <input
                  required
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Người liên hệ *</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Số điện thoại *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Slug Javis (VD: shin-aios)</label>
                <input
                  value={form.javisClientSlug}
                  onChange={(e) => setForm({ ...form, javisClientSlug: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Gói dịch vụ</label>
                <SelectDropdown
                  ariaLabel="Chọn gói dịch vụ"
                  value={form.plan}
                  onChange={(val) => setForm({ ...form, plan: val as LeadPlanValue })}
                  options={leadPlanValues.map((p) => ({ value: p, label: leadPlanLabels[p] }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Trạng thái hợp đồng</label>
                <SelectDropdown
                  ariaLabel="Chọn trạng thái hợp đồng"
                  value={form.contractStatus}
                  onChange={(val) => setForm({ ...form, contractStatus: val as CustomerRow["contractStatus"] })}
                  options={[
                    { value: "active", label: "Đang vận hành" },
                    { value: "paused", label: "Tạm dừng" },
                    { value: "completed", label: "Đã hoàn thành" },
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Phí hàng tháng (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  value={form.monthlyFee}
                  onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Link Fanpage</label>
                <input
                  value={form.fanpageUrl}
                  onChange={(e) => setForm({ ...form, fanpageUrl: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-2">Ghi chú</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                onClick={() => setModalMode(null)}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg-2 hover:text-fg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas hover:bg-accent-hover"
              >
                {modalMode === "create" ? "Thêm khách hàng" : "Tiếp tục xác nhận"}
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
          changes={confirmState.changes}
          requireText={confirmState.requireText}
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
