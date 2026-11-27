import Image from "next/image";
import { cn } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Logo chính thức Phúc Khánh Digital, tách từ file vector gốc (public/brand/logo-original.svg)
 * thành các phần nền trong suốt:
 *  - logo-mark.svg      : biểu tượng chuông PK (612 x 530)
 *  - logo-wordmark.svg  : chữ PHÚC KHÁNH + DIGITAL (1012 x 168)
 *  - logo-full.svg      : bản xếp dọc đầy đủ (1012 x 692), dùng cho Footer / OG
 */
export function LogoMark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image
        src={`${basePath}/brand/logo-mark.svg`}
        alt=""
        width={612}
        height={530}
        unoptimized
        priority={priority}
        className={cn("pk-logo-dark h-10 w-auto", className)}
      />
      <Image
        src={`${basePath}/brand/logo-mark-light.svg`}
        alt=""
        width={612}
        height={530}
        unoptimized
        priority={priority}
        className={cn("pk-logo-light h-10 w-auto", className)}
      />
    </>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark priority />
      <Image
        src={`${basePath}/brand/logo-wordmark.svg`}
        alt="Phúc Khánh Digital"
        width={1012}
        height={168}
        unoptimized
        priority
        className="pk-logo-dark h-[26px] w-auto"
      />
      <Image
        src={`${basePath}/brand/logo-wordmark-light.svg`}
        alt="Phúc Khánh Digital"
        width={1012}
        height={168}
        unoptimized
        priority
        className="pk-logo-light h-[26px] w-auto"
      />
    </span>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <Image
      src={`${basePath}/brand/logo-full.svg`}
      alt="Phúc Khánh Digital"
      width={1012}
      height={692}
      unoptimized
      className={cn("pk-wordmark h-auto w-48", className)}
    />
  );
}
