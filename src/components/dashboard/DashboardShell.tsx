"use client";

import {
  BarChart3,
  ExternalLink,
  FileCheck2,
  Globe,
  Inbox,
  KeyRound,
  LogOut,
  Users,
} from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import type { UserRole } from "@/db/types";
import { roleLabels } from "@/lib/permissions";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: BarChart3, exact: true },
  { href: "/dashboard/content", label: "Duyệt bài", icon: FileCheck2, exact: false },
  { href: "/dashboard/fanpages", label: "Fanpages", icon: Globe, exact: false },
  { href: "/dashboard/leads", label: "Lead", icon: Inbox, exact: false },
  { href: "/dashboard/customers", label: "Khách hàng", icon: Users, exact: false },
  { href: "/dashboard/accounts", label: "Tài khoản", icon: KeyRound, exact: false },
];

const JAVIS_URL = "https://phuckhanhstudio.tail158e96.ts.net/";

export function DashboardShell({
  username,
  role,
  children,
}: {
  username: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div className="flex min-h-dvh w-full">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/60 p-4 lg:flex">
          <div className="flex items-center justify-between px-2 py-2">
            <Link href="/" aria-label="Về trang chủ Landing Page">
              <Logo />
            </Link>
          </div>

          <div className="mt-6 flex-1 space-y-1">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active ? "text-canvas" : "text-fg-2 hover:bg-elevated/70 hover:text-fg",
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="dashboard-nav-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-accent"
                    />
                  )}
                  <Icon size={17} strokeWidth={1.7} className="relative z-10 shrink-0" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-line pt-4">
            {role === "ADMIN" && (
              <a
                href={JAVIS_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-line bg-canvas/80 px-3.5 py-2.5 text-xs font-medium text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
              >
                <span>Mở Javis OS (Nội bộ)</span>
                <ExternalLink size={14} />
              </a>
            )}

            <div className="flex items-center justify-between rounded-xl bg-elevated/60 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-fg">{username}</p>
                <p className="truncate font-mono text-[10px] text-accent">{roleLabels[role]}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Đăng xuất"
                className="inline-flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-canvas hover:text-fg disabled:opacity-50"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-xl lg:hidden">
            <Link href="/" aria-label="Về trang chủ">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              {role === "ADMIN" && (
                <a
                  href={JAVIS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-fg-2 hover:text-fg"
                >
                  <span>Javis</span>
                  <ExternalLink size={12} />
                </a>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Đăng xuất"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-fg-2 hover:text-fg"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <m.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: easeOutExpo }}
              className="mx-auto w-full max-w-6xl"
            >
              {children}
            </m.div>
          </main>
        </div>
      </div>

      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-6 gap-1 py-1.5">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-accent" : "text-fg-3 hover:text-fg",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.6} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
