import Image from "next/image";
import { hoaSuaPost } from "@/data/site-config";

export function HoaSuaPhoto() {
  return (
    <div className="absolute inset-0 bg-[#192938]">
      <Image
        src={hoaSuaPost.photoSrc}
        alt={hoaSuaPost.photoAlt}
        fill
        sizes="(min-width: 1024px) 650px, (min-width: 768px) 50vw, 100vw"
        className="object-contain"
      />
    </div>
  );
}
