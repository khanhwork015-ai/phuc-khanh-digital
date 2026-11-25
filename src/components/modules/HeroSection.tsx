import { ArrowRight, Check } from "lucide-react";
import { AmbientShaderCanvas } from "@/components/motion/AmbientShaderCanvas";
import { KineticMarquee } from "@/components/motion/KineticMarquee";
import { ScrollScale } from "@/components/motion/ScrollScale";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { heroContent } from "@/data/site-config";
import { HeroPostMockup } from "./HeroPostMockup";
import { HeroBell } from "./hero/HeroBell";
import { HeroScrollStage } from "./hero/HeroScrollStage";
import { TiltCard } from "./hero/TiltCard";

export function HeroSection() {
  return (
    <>
      <section aria-labelledby="hero-title" className="relative isolate border-b border-line">
        <AmbientShaderCanvas className="-z-20" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-b from-transparent to-canvas"
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
                  className="mt-6 text-balance text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-fg sm:text-5xl lg:text-[3.6rem]"
                >
                  {heroContent.headline}
                </h1>
              </div>

              <div className="hero-fade-up" style={{ animationDelay: "0.12s" }}>
                <p className="mt-6 max-w-xl text-pretty text-[16.5px] leading-relaxed text-fg-2 md:text-[17px]">
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
        />
      </section>

      <KineticMarquee />

      {/* Khối minh họa bài đăng thực tế tách riêng để không che chuông 3D ở Hero, phóng zoom-in khi cuộn tới */}
      <section aria-label="Minh họa bài đăng Fanpage" className="border-b border-line py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 md:px-8 lg:grid-cols-[44fr_56fr] lg:gap-16">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">Đầu ra thực tế</p>
            <h2 className="mt-3 text-balance text-2xl font-bold leading-snug tracking-[-0.02em] text-fg md:text-3xl">
              Mỗi bài đăng đi qua 4 bước kiểm soát trước khi lên sóng.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-fg-2">
              Từ viết caption đúng giọng thương hiệu, gắn logo gốc vào vùng an toàn, đến chờ bạn duyệt 1 chạm và tự động đăng đúng khung giờ vàng.
            </p>
          </div>

          <ScrollScale from={0.78} toExit={0.92} rotateXFrom={12}>
            <TiltCard>
              <HeroPostMockup />
            </TiltCard>
          </ScrollScale>
        </div>
      </section>
    </>
  );
}
