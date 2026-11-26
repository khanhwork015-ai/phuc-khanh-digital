"use client";

import { KeyRound, Lock, Plus, RotateCcw, Shield, Trash2, Unlock } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { userRoles, type UserRole } from "@/db/types";
import { roleLabels } from "@/lib/permissions";
import { easeOutExpo } from "@/lib/theme";

type AccountRow = {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  hasPin?: boolean;
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

export function AccountsClient({
  canEdit = false,
  currentUserId,
}: {
  canEdit?: boolean;
  currentUserId?: string;
}) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [customerId, setCustomerId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
    if (username.trim().length < 3 || password.length < 8) {
      setCreateError("Vui lòng nhập username (tối thiểu 3 ký tự) và mật khẩu (tối thiểu 8 ký tự).");
      return;
    }
    if (role === "CUSTOMER" && !customerId) {
      setCreateError("Tài khoản Khách hàng bắt buộc phải chọn hồ sơ khách hàng liên kết.");
      return;
    }

    const chosen = customers.find((c) => c.id === customerId);
    const targetDesc = role === "CUSTOMER" ? chosen?.businessName ?? "khách hàng" : roleLabels[role];

    setConfirmState({
      open: true,
      title: `Cấp tài khoản "${username.trim()}"`,
      description: `Vai trò: ${roleLabels[role]}${role === "CUSTOMER" ? ` — liên kết ${targetDesc}` : ""}.`,
      confirmLabel: "Cấp tài khoản",
      variant: "default",
      errorMessage: null,
      action: async () => {
        const res = await fetch("/api/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            role,
            customerId: role === "CUSTOMER" ? customerId : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Tạo thất bại." } : null));
          return;
        }
        setShowCreate(false);
        setUsername("");
        setPassword("");
        setRole("CUSTOMER");
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
    if (!resetTarget || !currentPassword || newPassword.length < 8) return;
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
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Cập nhật thất bại." } : null));
          return;
        }
        setResetTarget(null);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmState(null);
      },
    });
  }

  function requestDeleteAccount(acc: AccountRow) {
    setConfirmState({
      open: true,
      title: `Xóa vĩnh viễn tài khoản "${acc.username}"`,
      description:
        "Tài khoản và toàn bộ phiên đăng nhập của người dùng này sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục.",
      confirmLabel: "Xóa vĩnh viễn",
      variant: "danger",
      requireText: acc.username,
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/accounts/${acc.id}`, { method: "DELETE" });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Xóa thất bại." } : null));
          return;
        }
        setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
        setConfirmState(null);
      },
    });
  }

  function requestResetPin(acc: AccountRow) {
    setConfirmState({
      open: true,
      title: `Đặt lại mã PIN cho "${acc.username}"`,
      description: "Mã PIN 4 số hiện tại sẽ bị xóa. Người dùng sẽ được yêu cầu tạo mã PIN mới ở lần truy cập tiếp theo.",
      confirmLabel: "Đặt lại PIN",
      variant: "default",
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/accounts/${acc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetPin: true }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Đặt lại PIN thất bại." } : null));
          return;
        }
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, hasPin: false } : a)));
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
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreate(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-canvas transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} />
            <span>Cấp tài khoản mới</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
          <div className="lg:min-w-[940px]">
            <div
              className={
                canEdit
                  ? "hidden border-b border-line bg-canvas/50 px-5 py-3 text-[11px] font-mono uppercase tracking-[0.12em] text-fg-3 lg:grid lg:grid-cols-[minmax(150px,1.3fr)_minmax(180px,1.2fr)_120px_108px_368px] lg:items-center lg:gap-3"
                  : "hidden border-b border-line bg-canvas/50 px-5 py-3 text-[11px] font-mono uppercase tracking-[0.12em] text-fg-3 lg:grid lg:grid-cols-[minmax(150px,1.3fr)_minmax(180px,1.2fr)_120px_108px] lg:items-center lg:gap-3"
              }
            >
              <span>Tài khoản</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Mã PIN</span>
              {canEdit && <span className="text-right">Thao tác</span>}
            </div>

            <div className="divide-y divide-line">
              {accounts.map((acc, idx) => (
                <m.div
                  key={acc.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.15), ease: easeOutExpo }}
                  className={
                    canEdit
                      ? "grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-canvas/30 lg:grid-cols-[minmax(150px,1.3fr)_minmax(180px,1.2fr)_120px_108px_368px] lg:items-center lg:gap-3 lg:px-5"
                      : "grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-canvas/30 lg:grid-cols-[minmax(150px,1.3fr)_minmax(180px,1.2fr)_120px_108px] lg:items-center lg:gap-3 lg:px-5"
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{acc.username}</p>
                    <p className="truncate text-xs text-fg-3">
                      {acc.customerName
                        ? `Khách hàng: ${acc.customerCode} · ${acc.customerName}`
                        : "Tài khoản nội bộ"}
                    </p>
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 font-mono text-[11px] text-accent">
                      <Shield size={11} />
                      {roleLabels[acc.role] ?? acc.role}
                    </span>
                  </div>

                  <div>
                    <span
                      className={
                        acc.isActive
                          ? "inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300"
                          : "inline-flex items-center rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300"
                      }
                    >
                      {acc.isActive ? "Đang hoạt động" : "Đã khóa"}
                    </span>
                  </div>

                  <div>
                    <span
                      className={
                        acc.hasPin
                          ? "inline-flex items-center rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] text-fg-2"
                          : "inline-flex items-center rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] text-fg-3"
                      }
                    >
                      {acc.hasPin ? "Đã đặt PIN" : "Chưa đặt PIN"}
                    </span>
                  </div>

                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2 lg:grid lg:grid-cols-[114px_104px_92px_36px] lg:items-center lg:gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetTarget(acc);
                          setCurrentPassword("");
                          setNewPassword("");
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-elevated px-2.5 text-xs font-medium text-fg hover:border-line-strong"
                      >
                        <KeyRound size={13} />
                        <span>Đổi mật khẩu</span>
                      </button>

                      {acc.hasPin ? (
                        <button
                          type="button"
                          onClick={() => requestResetPin(acc)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-elevated px-2.5 text-xs font-medium text-fg-2 hover:border-line-strong hover:text-fg"
                        >
                          <RotateCcw size={13} />
                          <span>Đặt lại PIN</span>
                        </button>
                      ) : (
                        <span className="hidden lg:block" aria-hidden />
                      )}

                      {acc.role !== "ADMIN" ? (
                        <button
                          type="button"
                          onClick={() => requestToggleActive(acc)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-elevated px-2.5 text-xs font-medium text-fg-2 hover:border-line-strong hover:text-fg"
                        >
                          {acc.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                          <span>{acc.isActive ? "Khóa" : "Mở khóa"}</span>
                        </button>
                      ) : (
                        <span className="hidden lg:block" aria-hidden />
                      )}

                      {acc.id !== currentUserId ? (
                        <button
                          type="button"
                          onClick={() => requestDeleteAccount(acc)}
                          aria-label={`Xóa tài khoản ${acc.username}`}
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-line text-fg-3 transition-colors hover:border-red-500/40 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span className="hidden lg:block" aria-hidden />
                      )}
                    </div>
                  )}
                </m.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreate && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={requestCreateAccount}
            className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6"
          >
            <h2 className="text-lg font-semibold text-fg">Cấp tài khoản mới</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Vai trò *</label>
                <SelectDropdown
                  ariaLabel="Chọn vai trò"
                  value={role}
                  onChange={(val) => setRole(val as UserRole)}
                  options={userRoles.map((r) => ({ value: r, label: roleLabels[r] }))}
                />
              </div>
              {role === "CUSTOMER" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-2">Chọn khách hàng *</label>
                  <SelectDropdown
                    ariaLabel="Chọn khách hàng"
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="-- Chọn khách hàng --"
                    options={customers.map((c) => ({
                      value: c.id,
                      label: `${c.code} - ${c.businessName}`,
                      avatarText: c.businessName.charAt(0).toUpperCase(),
                    }))}
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Tên đăng nhập *</label>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: shin.aios hoặc mod.linh"
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
                  placeholder="Nhập mật khẩu cấp cho tài khoản"
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

      {resetTarget && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold text-fg">Đặt lại mật khẩu: {resetTarget.username}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu cũ của tài khoản này"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-2">Mật khẩu mới (tối thiểu 8 ký tự) *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
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
                disabled={!currentPassword || newPassword.length < 8}
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
          requireText={confirmState.requireText}
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
