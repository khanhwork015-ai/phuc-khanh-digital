"use client";

import { Check, FileImage, Send, TrendingUp } from "lucide-react";
import { m } from "motion/react";
import type { ProcessPreview as PreviewKey } from "@/data/process-steps";
import { hoaSuaPost } from "@/data/site-config";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Khung chứa chung cho mọi preview: viền hairline, tiêu đề mono. */
function Frame({ label, meta, children }: { label: string; meta?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-[11.5px] text-fg-2">{label}</span>
        {meta && <span className="font-mono text-[11px] text-fg-3">{meta}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-4 border-b border-line py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="pt-0.5 text-[12.5px] text-fg-3">{k}</span>
      <div className="min-w-0 text-[13.5px] text-fg">{children}</div>
    </div>
  );
}

function BrandKitPreview() {
  return (
    <Frame label="Hồ sơ thương hiệu · Hoa Sữa" meta="riêng biệt">
      <Row k="Bảng màu">
        <div className="flex gap-1.5">
          {["#192938", "#243b2a", "#fbefdc", "#b6c97d"].map((c) => (
            <span key={c} className="size-6 rounded-md border border-line" style={{ background: c }} title={c} />
          ))}
        </div>
      </Row>
      <Row k="Xưng hô">Thương hiệu xưng &quot;Hoa Sữa&quot;, gọi khách là &quot;Quý khách&quot;</Row>
      <Row k="Từ cần tránh">
        <div className="flex flex-wrap gap-1.5">
          {["rẻ nhất", "cam kết 100%", "siêu phẩm"].map((w) => (
            <span key={w} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-fg-2 line-through decoration-red-400/70">
              {w}
            </span>
          ))}
        </div>
      </Row>
      <Row k="Hoạt động">
        <ul className="space-y-1 font-mono text-[12.5px]">
          <li className="flex justify-between gap-3"><span className="text-fg-2">Ngày 24/11</span>Vẫn mở cửa</li>
          <li className="text-fg-2">{hoaSuaPost.address}</li>
        </ul>
      </Row>
      <Row k="Logo gốc">
        <span className="inline-flex items-center gap-2 rounded-lg border border-line-accent bg-accent-muted px-2.5 py-1 font-mono text-[12px] text-ivory">
          <FileImage size={14} strokeWidth={1.5} className="text-accent" aria-hidden />
          hoa-sua-logo.png
          <Check size={13} strokeWidth={2} className="text-accent" aria-hidden />
        </span>
      </Row>
    </Frame>
  );
}

type Pillar = "value" | "sale" | "engage";
// Lịch mẫu 20 bài: 12 giá trị (60%), 5 bán hàng (25%), 3 tương tác (15%)
const schedule: Record<number, Pillar> = {
  1: "value", 2: "sale", 4: "value", 5: "engage", 7: "value", 8: "value", 9: "sale", 11: "value",
  12: "value", 14: "engage", 15: "value", 16: "sale", 18: "value", 19: "value", 21: "sale",
  22: "value", 23: "engage", 25: "value", 26: "sale", 28: "value",
};

const pillarStyle: Record<Pillar, string> = {
  value: "bg-fg-2",
  sale: "bg-accent",
  engage: "border border-ivory bg-transparent",
};

function CalendarPreview() {
  const legend: { key: Pillar; label: string; pct: number }[] = [
    { key: "value", label: "Kiến thức hữu ích", pct: 60 },
    { key: "sale", label: "Bán hàng", pct: 25 },
    { key: "engage", label: "Tương tác", pct: 15 },
  ];
  return (
    <Frame label="Lịch đăng · Tháng 12" meta="20 bài">
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10.5px] text-fg-3">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <span key={d} className="pb-1">{d}</span>
        ))}
        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
          const p = schedule[day];
          return (
            <m.div
              key={day}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: day * 0.012, duration: 0.2 }}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border",
                p ? "border-line-strong bg-elevated text-fg-2" : "border-line text-fg-3",
              )}
            >
              {day}
              {p && <span className={cn("size-1.5 rounded-[2px]", pillarStyle[p])} />}
            </m.div>
          );
        })}
      </div>
      <div className="mt-5 flex h-2 overflow-hidden rounded-full" aria-hidden>
        {legend.map((l) => (
          <m.span
            key={l.key}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.2 }}
            style={{ width: `${l.pct}%` }}
            className={cn("origin-left", l.key === "engage" ? "bg-ivory/70" : pillarStyle[l.key], "border-0")}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-fg-2">
        {legend.map((l) => (
          <li key={l.key} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-[2px]", pillarStyle[l.key])} />
            {l.label}
            <span className="font-mono text-fg-3">{l.pct}%</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function EditingPreview() {
  return (
    <div className="grid gap-3">
      <Frame label="Lượt 1 · đủ dữ kiện" meta="bản nháp">
        <p className="text-[13.5px] leading-relaxed text-fg-2">
          <del className="text-fg-3 decoration-red-400/70">Ngày lễ đến rồi, bạn đã có điểm hẹn lý tưởng chưa?</del>{" "}
          Hoa Sữa Coffee &amp; Tea vẫn <mark className="rounded bg-accent-muted px-1 text-ivory">hoạt động bình thường</mark> ngày{" "}
          <mark className="rounded bg-accent-muted px-1 text-ivory">24/11</mark>.{" "}
          <del className="text-fg-3 decoration-red-400/70">Hãy đến ngay để trải nghiệm hương vị tuyệt vời!</del>
        </p>
      </Frame>
      <Frame label="Lượt 2 · gọt câu chữ" meta="sẵn sàng">
        <p className="text-[13.5px] leading-relaxed text-fg">
          Nhân dịp Ngày Văn hóa Việt Nam – 24/11, Hoa Sữa Coffee &amp; Tea vẫn hoạt động bình thường để phục vụ Quý khách.
          Hoa Sữa luôn sẵn sàng đón tiếp và phục vụ Quý khách!
        </p>
      </Frame>
    </div>
  );
}

function ReviewPreview() {
  const checks = ["Chính tả tiếng Việt trên ảnh và caption", "Ảnh không dị dạng, không watermark", "Logo gốc đúng vùng an toàn", "Dữ kiện khớp Brand Kit"];
  return (
    <Frame label="Kiểm duyệt trước khi gửi" meta="khung điện thoại">
      <ul className="space-y-2.5">
        {checks.map((c, i) => (
          <m.li
            key={c}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.3, ease: easeOutExpo }}
            className="flex items-center gap-3 rounded-xl border border-line bg-elevated/60 px-3.5 py-3 text-[13.5px] text-fg"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-accent text-canvas">
              <Check size={13} strokeWidth={2.5} aria-hidden />
            </span>
            {c}
          </m.li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-line-accent bg-accent-muted px-3.5 py-3">
        <span className="flex items-center gap-2 text-[13px] text-ivory">
          <Send size={14} strokeWidth={1.5} className="text-accent" aria-hidden />
          Gửi vào cổng duyệt của bạn
        </span>
        <span className="font-mono text-[12px] text-accent">19:00</span>
      </div>
    </Frame>
  );
}

function ReportPreview() {
  const rows = [
    { k: "Lượt tiếp cận", v: "12.480", d: "+18%" },
    { k: "Lượt tương tác", v: "1.136", d: "+9%" },
    { k: "Tin nhắn hỏi mua", v: "42", d: "+12" },
    { k: "Khung giờ tốt nhất", v: "19:00 - 20:30", d: "" },
  ];
  return (
    <Frame label="Báo cáo tuần · Chủ nhật 08:00" meta="số liệu minh họa">
      <dl>
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-4 border-b border-line py-3 first:pt-0">
            <dt className="text-[13px] text-fg-2">{r.k}</dt>
            <dd className="flex items-baseline gap-2.5">
              <span className="font-mono text-[15px] text-fg">{r.v}</span>
              {r.d && (
                <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-accent">
                  <TrendingUp size={12} strokeWidth={1.75} aria-hidden />
                  {r.d}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-xl border border-line bg-elevated/60 px-3.5 py-3 text-[13px] leading-relaxed text-fg-2">
        <span className="font-medium text-fg">Tuần tới:</span> dời bài giới thiệu đồ uống sang 19:30, thêm 1 Reels quay không gian quán.
      </p>
    </Frame>
  );
}

export function ProcessPreview({ preview }: { preview: PreviewKey }) {
  switch (preview) {
    case "brandkit":
      return <BrandKitPreview />;
    case "calendar":
      return <CalendarPreview />;
    case "editing":
      return <EditingPreview />;
    case "review":
      return <ReviewPreview />;
    case "report":
      return <ReportPreview />;
  }
}
