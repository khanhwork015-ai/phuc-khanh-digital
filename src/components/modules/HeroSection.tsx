import { ArrowRight, Check } from "lucide-react";
import { AmbientShaderCanvas } from "@/components/motion/AmbientShaderCanvas";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { heroContent } from "@/data/site-config";
import { HeroPostMockup } from "./HeroPostMockup";
import { HeroBell } from "./hero/HeroBell";
import { HeroScrollStage } from "./hero/HeroScrollStage";
import { TiltCard } from "./hero/TiltCard";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-line pt-28 pb-20 md:pt-36 md:pb-28"
    >
      <AmbientShaderCanvas className="-z-10" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-canvas"
      />

      <HeroScrollStage
        bell={<HeroBell />}
        text={
          <>
          <div className="hero-fade-up">
            <Badge>{heroContent.badge}</Badge>
          </div>

          <div className="hero-rise" style={{ animationDelay: "0.06s" }}>
            <h1
              id="hero-title"
              className="mt-6 text-balance text-[2.5rem] font-bold leading-[1.08] tracking-[-0.03em] text-fg sm:text-5xl lg:text-[3.6rem]"
            >
              {heroContent.headline}
            </h1>
          </div>

          <div className="hero-fade-up" style={{ animationDelay: "0.12s" }}>
            <p className="mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-fg-2">
              {heroContent.subheadline}
            </p>
          </div>

          <div className="hero-fade-up mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.18s" }}>
            <ButtonLink href={heroContent.primaryCta.href} size="lg">
              {heroContent.primaryCta.label}
              <ArrowRight size={17} strokeWidth={1.75} aria-hidden />
            </ButtonLink>
            <ButtonLink href={heroContent.secondaryCta.href} size="lg" variant="secondary">
              {heroContent.secondaryCta.label}
            </ButtonLink>
          </div>

          <div className="hero-fade-up" style={{ animationDelay: "0.24s" }}>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6">
              {heroContent.proofPoints.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-fg-2">
                  <Check size={15} strokeWidth={1.75} className="text-accent" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          </>
        }
        visual={
          <div className="hero-fade-up" style={{ animationDelay: "0.15s" }}>
            <p className="sr-only">
              Minh họa một bài đăng Fanpage đi qua 4 trạng thái: đang viết, gắn logo gốc, chờ duyệt và đã đăng đúng giờ.
            </p>
            <TiltCard>
              <HeroPostMockup />
            </TiltCard>
          </div>
        }
      />
    </section>
  );
}
