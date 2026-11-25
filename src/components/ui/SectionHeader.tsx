import { GrowLine } from "@/components/motion/GrowLine";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  index: string;
  title: string;
  description?: string;
  id?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({ eyebrow, index, title, description, id, align = "left", className }: SectionHeaderProps) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <p className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.14em] text-fg-3">
        <span className="text-accent">{index}</span>
        <GrowLine />
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-4 text-balance text-3xl font-bold leading-[1.15] tracking-[-0.025em] text-fg md:text-[2.6rem]"
      >
        {title}
      </h2>
      {description && <p className="mt-4 text-pretty text-[16.5px] leading-relaxed text-fg-2">{description}</p>}
    </Reveal>
  );
}
