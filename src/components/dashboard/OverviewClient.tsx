"use client";

import { ArrowRight, CheckCircle2, FileClock, Inbox, TrendingUp, Users } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { leadPlanLabels, type LeadPlanValue } from "@/lib/lead-fields";
import { easeOutExpo } from "@/lib/theme";

type StatsPayload = {
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalLeads: number;
    newLeads: number;
    convertedLeads: number;
    conversionRate: number;
    pendingClientContent: number;
    monthlyRevenue: number;
    planBreakdown: Array<{ plan: string; total: number }>;
  };
  recentLeads: Array<{
    id: string;
    fullName: string;
    phone: string;
    plan: string;
    status: string;
    createdAt: string;
  }>;
};

const statusLabels: Record<string, string> = {
  new: "Mới",
  contacting: "Đang tư vấn",
  converted: "Đã chuyển đổi",
  archived: "Lưu trữ",
};

function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function OverviewClient() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/stats")
      .then(async (res) => {
        const json = (await res.json()) as StatsPayload & { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.message ?? "Không thể tải số liệu thống kê.");
        }
        if (active) setData(json);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-surface" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error ?? "Không có dữ liệu thống kê."}
      </div>
    );
  }

  const { stats, recentLeads } = data;
  const cards = [
    {
      label: "Khách đang vận hành",
      value: `${stats.activeCustomers}/${stats.totalCustomers}`,
      hint: "Hợp đồng đang hoạt động",
      icon: Users,
    },
    {
      label: "Lead mới chờ xử lý",
      value: String(stats.newLeads),
      hint: `Tổng ${stats.totalLeads} lượt đăng ký`,
      icon: Inbox,
    },
    {
      label: "Tỷ lệ chuyển đổi",
      value: `${stats.conversionRate}%`,
      hint: `${stats.convertedLeads} lead đã ký hợp đồng`,
      icon: TrendingUp,
    },
    {
      label: "Bài chờ khách duyệt",
      value: String(stats.pendingClientContent),
      hint: "Đồng bộ từ Javis OS",
      icon: FileClock,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Phúc Khánh Digital</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg sm:text-3xl">Tổng quan vận hành</h1>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
          <span className="text-fg-3">Doanh thu định kỳ / tháng: </span>
          <span className="font-semibold text-accent">{formatVnd(stats.monthlyRevenue)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <m.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: easeOutExpo }}
              className="rounded-2xl border border-line bg-surface/80 p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg-2">{card.label}</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon size={16} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-fg">{card.value}</p>
              <p className="mt-1 text-xs text-fg-3">{card.hint}</p>
            </m.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-line bg-surface/80 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-fg">Phân bổ theo gói dịch vụ</h2>
          <p className="mt-1 text-xs text-fg-3">Tỷ trọng khách hàng đang sử dụng từng gói</p>

          <div className="mt-5 space-y-4">
            {stats.planBreakdown.length === 0 ? (
              <p className="text-sm text-fg-3">Chưa có khách hàng nào trong hệ thống.</p>
            ) : (
              stats.planBreakdown.map((item) => {
                const pct = stats.totalCustomers > 0 ? Math.round((item.total / stats.totalCustomers) * 100) : 0;
                const label = leadPlanLabels[item.plan as LeadPlanValue] ?? item.plan;
                return (
                  <div key={item.plan} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-fg">{label}</span>
                      <span className="font-mono text-fg-2">
                        {item.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas">
                      <m.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: easeOutExpo }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface/80 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-fg">Lead mới từ Landing Page</h2>
              <p className="mt-1 text-xs text-fg-3">5 lượt đăng ký tư vấn gần nhất</p>
            </div>
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-line">
            {recentLeads.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-fg-3">
                <CheckCircle2 size={16} />
                <span>Chưa có lead nào từ form tư vấn.</span>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-fg">{lead.fullName}</p>
                    <p className="text-xs text-fg-3">
                      {lead.phone} · {leadPlanLabels[lead.plan as LeadPlanValue] ?? lead.plan}
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-fg-2">
                    {statusLabels[lead.status] ?? lead.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
