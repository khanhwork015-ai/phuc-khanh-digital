"use client";

import { ArrowLeft, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { easeOutExpo } from "@/lib/theme";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedUser = username.trim();
    if (trimmedUser.length < 3 || password.length < 6) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        redirectTo?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.message ?? "Đăng nhập không thành công. Vui lòng thử lại.");
        setSubmitting(false);
        return;
      }

      const target =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : data.redirectTo || "/portal";
      router.push(target);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
      setSubmitting(false);
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOutExpo }}
      className="w-full max-w-md"
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm text-fg-2 transition-colors hover:text-fg"
        >
          <ArrowLeft size={16} strokeWidth={1.6} />
          <span>Về trang chủ</span>
        </Link>
        <Logo />
      </div>

      <div className="rounded-2xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Cổng Khách Hàng & Quản Trị</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Đăng nhập hệ thống</h1>
          <p className="mt-1.5 text-sm text-fg-2">
            Truy cập bảng điều khiển quản trị hoặc không gian duyệt bài riêng của thương hiệu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-fg">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User
                size={16}
                strokeWidth={1.6}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3"
                aria-hidden="true"
              />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="h-11 w-full rounded-xl border border-line bg-canvas pl-10 pr-3.5 text-sm text-fg placeholder:text-fg-3 transition-colors focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-fg">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock
                size={16}
                strokeWidth={1.6}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3"
                aria-hidden="true"
              />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="h-11 w-full rounded-xl border border-line bg-canvas pl-10 pr-11 text-sm text-fg placeholder:text-fg-3 transition-colors focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-3 transition-colors hover:text-fg"
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-canvas transition-all duration-200 hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        <p className="mt-5 border-t border-line pt-4 text-center text-xs text-fg-3">
          Tài khoản được cấp trực tiếp bởi quản trị viên Phúc Khánh Digital.
        </p>
      </div>
    </m.div>
  );
}
