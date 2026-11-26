"use client";

import { ArrowUpRight, Check, CheckCircle2, ChevronDown, MessageCircle, Phone, RotateCcw, Send } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PRICING_CONFIG } from "@/data/pricing";
import { contactConfig } from "@/data/site-config";
import {
  leadFormResolver,
  leadPlanValues,
  type LeadFormValues,
  type LeadPlanValue,
} from "@/lib/lead-fields";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

const nextSteps = [
  "Đội ngũ liên hệ qua Zalo hoặc điện thoại trong giờ làm việc",
  "Trao đổi 15 phút về ngành hàng, hiện trạng Fanpage và mục tiêu đăng bài",
  "Đề xuất lộ trình 1 tháng kèm chi phí phù hợp, bạn thấy ổn mới bắt đầu",
];

export function LeadCaptureSection() {
  const [submitted, setSubmitted] = useState<LeadFormValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const nameId = useId();
  const phoneId = useId();
  const fanpageId = useId();
  const planId = useId();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: leadFormResolver,
    defaultValues: {
      fullName: "",
      phone: "",
      fanpageUrl: "",
      plan: "growth",
      website: "",
    },
  });

  const selectedPlan = useWatch({ control, name: "plan" });
  const [planOpen, setPlanOpen] = useState(false);
  const planDropdownRef = useRef<HTMLDivElement>(null);
  const planTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!planOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!planDropdownRef.current?.contains(e.target as Node)) {
        setPlanOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlanOpen(false);
        planTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [planOpen]);

  useEffect(() => {
    const onSelectPlan = (event: Event) => {
      const detail = (event as CustomEvent<LeadPlanValue>).detail;
      if (leadPlanValues.includes(detail)) {
        setValue("plan", detail, { shouldValidate: true });
        setSubmitted(null);
      }
    };
    window.addEventListener("pkd:select-plan", onSelectPlan);
    return () => window.removeEventListener("pkd:select-plan", onSelectPlan);
  }, [setValue]);

  const onSubmit = async (data: LeadFormValues) => {
    setServerError(null);
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      if (data.website.trim().length > 0) return;
      setSubmitted(data);
      return;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        setServerError(json?.message ?? "Không thể gửi yêu cầu lúc này. Bạn nhắn Zalo trực tiếp giúp đội ngũ nhé.");
        return;
      }
      setSubmitted(data);
    } catch {
      setServerError("Kết nối bị gián đoạn. Vui lòng thử lại hoặc nhắn Zalo trực tiếp.");
    }
  };

  return (
    <section id="dang-ky-tu-van" aria-labelledby="lead-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <SectionHeader
            index="07"
            eyebrow="Đăng ký tư vấn"
            title="Trao đổi 15 phút để xem Fanpage của bạn cần gì"
            description="Để lại thông tin, đội ngũ xem trước Fanpage hiện tại của bạn rồi hẹn lịch trao đổi ngắn gọn."
            id="lead-title"
          />

          <Reveal delay={0.08}>
            <ol className="mt-10 space-y-4 border-t border-line pt-8">
              {nextSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-[14.5px] text-fg-2">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface font-mono text-[11.5px] text-accent">
                    0{i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.14} className="mt-10 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:flex lg:flex-wrap">
            <a
              href={contactConfig.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line-strong bg-white/[0.02] px-4 text-[14px] font-medium text-fg transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.05] lg:h-11 lg:w-auto lg:justify-start"
            >
              <MessageCircle size={16} strokeWidth={1.5} className="text-accent" aria-hidden />
              Nhắn Zalo ngay
              <ArrowUpRight size={14} strokeWidth={1.5} className="text-fg-3" aria-hidden />
            </a>
            <a
              href={contactConfig.phoneHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line-strong bg-white/[0.02] px-4 font-mono text-[14px] font-medium text-fg transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.05] lg:h-11 lg:w-auto lg:justify-start"
            >
              <Phone size={16} strokeWidth={1.5} className="text-accent" aria-hidden />
              {contactConfig.phoneDisplay}
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-line-strong bg-surface p-6 md:p-8">
            {submitted ? (
              <div role="status" className="flex min-h-[380px] flex-col justify-between">
                <div>
                  <span className="flex size-12 items-center justify-center rounded-xl border border-line-accent bg-accent-muted text-accent">
                    <CheckCircle2 size={24} strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-fg">
                    Đã nhận thông tin tư vấn
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-fg-2">
                    Cảm ơn <span className="font-semibold text-ivory">{submitted.fullName}</span>. Đội ngũ sẽ liên hệ qua số{" "}
                    <span className="font-mono text-fg">{submitted.phone}</span> trong khung giờ {contactConfig.workingHours}.
                  </p>
                </div>

                <div className="mt-8 space-y-4 border-t border-line pt-6">
                  <p className="text-[13.5px] text-fg-3">Cần trao đổi gấp, bạn có thể nhắn trực tiếp:</p>
                  <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:flex lg:flex-wrap">
                    <a
                      href={contactConfig.zaloUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-5 text-[14.5px] font-semibold text-canvas transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-accent-hover"
                    >
                      Nhắn Zalo trực tiếp
                      <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
                    </a>
                    <a
                      href={contactConfig.messengerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line-strong px-5 text-[14.5px] font-medium text-fg transition-colors hover:border-white/30 hover:bg-white/[0.04]"
                    >
                      Nhắn Messenger
                      <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(null);
                        reset();
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] text-fg-3 min-[400px]:col-span-2 transition-colors hover:text-fg"
                    >
                      <RotateCcw size={14} strokeWidth={1.5} aria-hidden />
                      Gửi thêm yêu cầu
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {/* Trường ẩn chống spam (honeypot) */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="website-field">Website</label>
                  <input id="website-field" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor={nameId} className="block text-[13.5px] font-medium text-fg">
                      Họ và tên <span className="text-accent">*</span>
                    </label>
                    <input
                      id={nameId}
                      type="text"
                      autoComplete="name"
                      placeholder="VD: Nguyễn Minh Tuấn"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? `${nameId}-err` : undefined}
                      className={cn(
                        "mt-2 h-11 w-full rounded-xl border bg-canvas px-3.5 text-[14.5px] text-fg placeholder:text-fg-3 focus:outline-none",
                        errors.fullName ? "border-red-400/60" : "border-line focus:border-line-accent",
                      )}
                      {...register("fullName")}
                    />
                    {errors.fullName && (
                      <p id={`${nameId}-err`} className="mt-1.5 text-[12.5px] text-red-300">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={phoneId} className="block text-[13.5px] font-medium text-fg">
                      Số điện thoại / Zalo <span className="text-accent">*</span>
                    </label>
                    <input
                      id={phoneId}
                      type="tel"
                      autoComplete="tel"
                      placeholder="VD: 0909 123 456"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? `${phoneId}-err` : undefined}
                      className={cn(
                        "mt-2 h-11 w-full rounded-xl border bg-canvas px-3.5 text-[14.5px] text-fg placeholder:text-fg-3 focus:outline-none",
                        errors.phone ? "border-red-400/60" : "border-line focus:border-line-accent",
                      )}
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p id={`${phoneId}-err`} className="mt-1.5 text-[12.5px] text-red-300">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor={fanpageId} className="block text-[13.5px] font-medium text-fg">
                    Link Fanpage hiện tại <span className="font-normal text-fg-3">(tùy chọn)</span>
                  </label>
                  <input
                    id={fanpageId}
                    type="url"
                    placeholder="https://facebook.com/ten-fanpage-cua-ban"
                    aria-invalid={Boolean(errors.fanpageUrl)}
                    aria-describedby={errors.fanpageUrl ? `${fanpageId}-err` : undefined}
                    className={cn(
                      "mt-2 h-11 w-full rounded-xl border bg-canvas px-3.5 text-[14.5px] text-fg placeholder:text-fg-3 focus:outline-none",
                      errors.fanpageUrl ? "border-red-400/60" : "border-line focus:border-line-accent",
                    )}
                    {...register("fanpageUrl")}
                  />
                  {errors.fanpageUrl && (
                    <p id={`${fanpageId}-err`} className="mt-1.5 text-[12.5px] text-red-300">{errors.fanpageUrl.message}</p>
                  )}
                </div>

                <div ref={planDropdownRef} className="relative">
                  <label id={`${planId}-label`} htmlFor={planId} className="block text-[13.5px] font-medium text-fg">
                    Gói quan tâm
                  </label>
                  <input type="hidden" {...register("plan")} />
                  <button
                    ref={planTriggerRef}
                    id={planId}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={planOpen}
                    aria-labelledby={`${planId}-label ${planId}`}
                    onClick={() => setPlanOpen((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        const idx = PRICING_CONFIG.findIndex((p) => p.id === selectedPlan);
                        const delta = e.key === "ArrowDown" ? 1 : -1;
                        const next = PRICING_CONFIG[(idx + delta + PRICING_CONFIG.length) % PRICING_CONFIG.length];
                        if (next) setValue("plan", next.id, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    className={cn(
                      "mt-2 flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-canvas px-3.5 text-left text-[14.5px] text-fg transition-colors duration-200 focus:outline-none",
                      planOpen ? "border-line-accent" : "border-line hover:border-line-strong focus:border-line-accent",
                    )}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <span>{PRICING_CONFIG.find((p) => p.id === selectedPlan)?.name ?? "Chọn gói"}</span>
                      {PRICING_CONFIG.find((p) => p.id === selectedPlan)?.badge && (
                        <span className="rounded-md border border-line-accent bg-accent-muted px-1.5 py-0.5 text-[11px] font-medium text-accent">
                          {PRICING_CONFIG.find((p) => p.id === selectedPlan)?.badge}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden
                      className={cn(
                        "shrink-0 text-fg-3 transition-transform duration-200",
                        planOpen && "rotate-180 text-accent",
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {planOpen && (
                      <m.ul
                        role="listbox"
                        aria-labelledby={`${planId}-label`}
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: easeOutExpo }}
                        className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line-strong bg-elevated/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-md"
                      >
                        {PRICING_CONFIG.map((plan) => {
                          const active = plan.id === selectedPlan;
                          return (
                            <li
                              key={plan.id}
                              role="option"
                              aria-selected={active}
                              onClick={() => {
                                setValue("plan", plan.id, { shouldValidate: true, shouldDirty: true });
                                setPlanOpen(false);
                                planTriggerRef.current?.focus();
                              }}
                              className={cn(
                                "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors duration-150",
                                active
                                  ? "bg-accent-muted text-ivory"
                                  : "text-fg-2 hover:bg-white/[0.05] hover:text-fg",
                              )}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className={cn("font-medium", active && "text-ivory")}>{plan.name}</span>
                                {plan.badge && (
                                  <span className="rounded-md border border-line-accent bg-accent-muted px-1.5 py-0.5 text-[11px] font-medium text-accent">
                                    {plan.badge}
                                  </span>
                                )}
                              </span>
                              {active && <Check size={15} strokeWidth={2} className="shrink-0 text-accent" aria-hidden />}
                            </li>
                          );
                        })}
                      </m.ul>
                    )}
                  </AnimatePresence>
                </div>

                {serverError && (
                  <p role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-[13.5px] text-red-200">
                    {serverError}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-semibold text-canvas transition-[background-color,transform,opacity] duration-200 ease-out hover:-translate-y-px hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Send size={16} strokeWidth={1.75} aria-hidden />
                    {isSubmitting ? "Đang gửi thông tin..." : "Đăng ký tư vấn vận hành"}
                  </button>
                  <p className="mt-3 text-center text-[12.5px] text-fg-3">
                    Thông tin của bạn chỉ dùng để liên hệ tư vấn, không chia sẻ cho bên thứ ba.
                  </p>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
