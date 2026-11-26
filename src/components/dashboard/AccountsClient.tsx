"use client";

import { KeyRound, Lock, Plus, Shield, Unlock } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { easeOutExpo } from "@/lib/theme";

type AccountRow = {
  id: string;
  username: string;
  role: "ADMIN" | "CUSTOMER";
  isActive: boolean;
  customerId: string | null;
  customerName: string | null;
  customerCode: string | null;
  lastLoginAt: string | null;
};

type CustomerOption = {
  id: string;
  code: string;
  businessName: string;
};

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "danger";
    errorMessage: string | null;
    action: () => Promise<void>;
  } | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [accRes, custRes] = await Promise.all([fetch("/api/admin/accounts"), fetch("/api/admin/customers")]);
      const accJson = (await accRes.json()) as { ok?: boolean; accounts?: AccountRow[] };
      const custJson = (await custRes.json()) as { ok?: boolean; customers?: CustomerOption[] };
      if (accRes.ok && accJson.ok && accJson.accounts) setAccounts(accJson.accounts);
      if (custRes.ok && custJson.ok && custJson.customers) setCustomers(custJson.customers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function requestCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!customerId || username.trim().length < 3 || password.length < 8) {
      setCreateError("Vui lòng chọn khách hàng, nhập username (>= 3 ký tự) và mật khẩu (>= 8 ký tự).");
      return;
    }

    const chosen = customers.find((c) => c.id === customerId);
    setConfirmState({
      open: true,
      title: `Tạo tài khoản cho ${chosen?.businessName ?? "khách hàng"}`,
      description: `Cấp tài khoản đăng nhập "${username.trim()}" để khách hàng truy cập Portal duyệt bài.`,
      confirmLabel: "Cấp tài khoản",
      variant: "default",
      errorMessage: null,
      action: async () => {
        const res = await fetch("/api/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password, customerId }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Tạo thất bại." } : null));
          return;
        }
        setShowCreate(false);
        setUsername("");
        setPassword("");
        setCustomerId("");
        setConfirmState(null);
        await loadAll();
      },
    });
  }

  function requestToggleActive(acc: AccountRow) {
    const nextActive = !acc.isActive;
    setConfirmState({
      open: true,
      title: nextActive ? `Mở khóa tài khoản "${acc.username}"` : `Khóa tài khoản "${acc.username}"`,
      description: nextActive
        ? "Tài khoản này sẽ có thể đăng nhập lại vào hệ thống."
        : "Tài khoản sẽ bị đăng xuất ngay lập tức và không thể đăng nhập cho đến khi được mở khóa.",
      confirmLabel: nextActive ? "Mở khóa tài khoản" : "Khóa tài khoản",
      variant: nextActive ? "default" : "danger",
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/accounts/${acc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextActive }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Thao tác thất bại." } : null));
          return;
        }
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, isActive: nextActive } : a)));
        setConfirmState(null);
      },
    });
  }

  function requestResetPassword() {
    if (!resetTarget || newPassword.length < 8) return;
    const target = resetTarget;
    setConfirmState({
      open: true,
      title: `Đặt lại mật khẩu cho "${target.username}"`,
      description: "Mật khẩu mới sẽ có hiệu lực ngay và các phiên đăng nhập cũ của tài khoản này sẽ bị thu hồi.",
      confirmLabel: "Đặt lại mật khẩu",
      variant: "default",
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/accounts/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Cập nhật thất bại." } : null));
          return;
        }
        setResetTarget(null);
        setNewPassword("");
        setConfirmState(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Phân quyền truy cập</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Quản lý Tài khoản</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          <span>Cấp tài khoản khách</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {accounts.map((acc, idx) => (
            <m.div
              key={acc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-fg">{acc.username}</p>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-canvas px-2 py-0.5 font-mono text-[11px] text-accent">
                    <Shield size={11} />
                    {acc.role}
                  </span>
                  <span
                    className={
                      acc.isActive
                        ? "rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                        : "rounded-lg bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300"
                    }
                  >
                    {acc.isActive ? "Đang hoạt động" : "Đã khóa"}
                  </span>
                </div>
                <p className="text-xs text-fg-3">
                  {acc.customerName
                    ? `Khách hàng: ${acc.customerCode} · ${acc.customerName}`
                    : "Tài khoản quản trị nội bộ"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(acc);
                    setNewPassword("");
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-elevated px-3 text-xs font-medium text-fg hover:border-line-strong"
                >
                  <KeyRound size={13} />
                  <span>Đổi mật khẩu</span>
                </button>
                {acc.role !== "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => requestToggleActive(acc)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-elevated px-3 text-xs font-medium text-fg-2 hover:text-fg"
                  >
                    {acc.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                    <span>{acc.isActive ? "Khóa" : "Mở khóa"}</span>
                  </button>
                )}
              </div>
            </m.div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={requestCreateAccount}
            className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6"
          >
            <h2 className="text-lg font-semibold text-fg">Cấp tài khoản cho Khách hàng</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Chọn khách hàng *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.businessName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Tên đăng nhập *</label>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: shin.aios"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Mật khẩu ban đầu (tối thiểu 8 ký tự) *</label>
                <input
                  required
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu cấp cho khách"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {createError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {createError}
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

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold text-fg">Đặt lại mật khẩu: {resetTarget.username}</h2>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-fg-2">Mật khẩu mới (tối thiểu 8 ký tự)</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg-2 hover:text-fg"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={newPassword.length < 8}
                onClick={requestResetPassword}
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
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
