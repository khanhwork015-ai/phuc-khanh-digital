import { cn } from "@/lib/utils";

/** Ảnh minh họa dựng bằng CSS: quầy bánh dưới ánh nắng, chữ tiếng Việt chuẩn dấu. */
export function BakeryPhoto({ title, subtitle, className }: { title: string; subtitle: string; className?: string }) {
  return (
    <div className={cn("absolute inset-0 bg-[#1c1712]", className)}>
      <div className="absolute -left-10 -top-10 h-[140%] w-1/2 rotate-[18deg] bg-[#f3d9a4]/[0.07] blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] border-t border-[#3a2e22] bg-[#2a2118]" />
      {[
        "left-[14%] bottom-[24%] w-[30%] rotate-[-6deg]",
        "left-[40%] bottom-[28%] w-[28%] rotate-[4deg]",
        "left-[60%] bottom-[22%] w-[26%] rotate-[-2deg]",
      ].map((pos) => (
        <div
          key={pos}
          className={cn("absolute aspect-[3/1] rounded-[50%] bg-[#b7793a] shadow-[inset_0_-6px_10px_rgba(0,0,0,0.35)]", pos)}
        >
          <div className="absolute inset-x-[18%] top-[30%] h-px bg-[#e7b878]/60" />
          <div className="absolute inset-x-[26%] top-[50%] h-px bg-[#e7b878]/50" />
        </div>
      ))}
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-[clamp(15px,2.4vw,20px)] font-bold leading-tight tracking-[-0.01em] text-[#fbefdc]">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#fbefdc]/70">{subtitle}</p>
      </div>
    </div>
  );
}
