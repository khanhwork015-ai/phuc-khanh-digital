"use client";

import { Check, KeyRound, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

type PinStep = "verify" | "create" | "confirm";

export function PinGateOverlay({
  initialHasPin,
  username,
  portalLabel,
  children,
}: {
  initialHasPin: boolean;
  username: string;
  portalLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [step, setStep] = useState<PinStep>(initialHasPin ? "verify" : "create");
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const shakeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function triggerShake(message: string) {
    setErrorMessage(message);
    setPin("");
    const el = shakeRef.current;
    if (el) {
      el.classList.remove("pin-shake");
      void el.offsetWidth;
      el.classList.add("pin-shake");
    }
    inputRef.current?.focus();
  }

  async function submitPinToServer(targetPin: string, confirmPin?: string) {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmPin ? { pin: targetPin, confirmPin } : { pin: targetPin }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        triggerShake(data.message ?? "Mã PIN không chính xác.");
        if (confirmPin) {
          setFirstPin("");
          setStep("create");
        }
        return;
      }

      setSuccess(true);
      timerRef.current = window.setTimeout(() => {
        setUnlocked(true);
      }, 320);
    } catch {
      triggerShake("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePinChange(raw: string) {
    if (submitting || success) return;
    const value = raw.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    if (errorMessage) setErrorMessage(null);

    if (value.length < 4) return;

    if (step === "create") {
      setFirstPin(value);
      setPin("");
      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      if (value !== firstPin) {
        setFirstPin("");
        setStep("create");
        triggerShake("Mã PIN xác nhận không khớp. Vui lòng tạo lại.");
        return;
      }
      void submitPinToServer(firstPin, value);
      return;
    }

    void submitPinToServer(value);
  }

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

  if (unlocked) {
    return <>{children}</>;
  }

  const heading =
    step === "create"
      ? "Tạo mã PIN 4 số"
      : step === "confirm"
        ? "Xác nhận lại mã PIN"
        : "Nhập mã PIN 4 số";

  const description =
    step === "create"
      ? "Thiết lập mã PIN 4 số cho lần đăng nhập đầu tiên. Các lần truy cập sau bạn sẽ dùng mã PIN này để mở khóa."
      : step === "confirm"
        ? "Nhập lại đúng 4 chữ số vừa tạo để hoàn tất thiết lập."
        : "Nhập mã PIN 4 số của bạn để tiếp tục truy cập hệ thống.";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      <div className="hairline-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-xs text-fg-2">
              {username}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface/90 px-6 py-10 text-center shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-8">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl border transition-colors duration-300",
              success
                ? "border-line-accent bg-accent-muted text-accent"
                : "border-line bg-elevated text-fg-2",
            )}
          >
            {submitting ? (
              <Loader2 size={22} className="animate-spin" />
            ) : success ? (
              <Check size={24} strokeWidth={1.75} aria-hidden />
            ) : (
              <KeyRound size={22} strokeWidth={1.5} aria-hidden />
            )}
          </span>

          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-accent">{portalLabel}</p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{heading}</h1>
          <p className="mt-2 max-w-xs text-sm text-fg-2">{description}</p>

          <div ref={shakeRef} className="relative mt-7">
            <label htmlFor={inputId} className="sr-only">
              Mã PIN 4 số
            </label>
            <div className="flex gap-2.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => {
                const filled = i < pin.length;
                const focusNext = i === pin.length;
                return (
                  <span
                    key={i}
                    className={cn(
                      "flex size-14 items-center justify-center rounded-xl border bg-canvas font-mono text-2xl transition-colors duration-200",
                      errorMessage
                        ? "border-red-400/60 text-red-300"
                        : success
                          ? "border-line-accent text-accent"
                          : filled
                            ? "border-line-strong text-fg"
                            : focusNext
                              ? "border-line-strong text-fg-3"
                              : "border-line text-fg-3",
                    )}
                  >
                    {filled ? "•" : ""}
                  </span>
                );
              })}
            </div>

            <input
              ref={inputRef}
              id={inputId}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              aria-label="Nhập mã PIN 4 số"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="mt-4 min-h-5">
            {errorMessage && <p className="text-xs text-red-300">{errorMessage}</p>}
            {step === "confirm" && !errorMessage && !submitting && (
              <button
                type="button"
                onClick={() => {
                  setFirstPin("");
                  setPin("");
                  setStep("create");
                  inputRef.current?.focus();
                }}
                className="text-xs text-fg-3 underline underline-offset-4 hover:text-fg-2"
              >
                Nhập lại mã PIN mới
              </button>
            )}
          </div>

          <div className="mt-6 w-full border-t border-line pt-5">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas px-3.5 text-xs font-medium text-fg-2 transition-colors hover:border-line-strong hover:text-fg disabled:opacity-50"
            >
              <LogOut size={13} />
              <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
