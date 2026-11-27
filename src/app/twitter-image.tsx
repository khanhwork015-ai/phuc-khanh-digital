import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Phúc Khánh Digital - Vận hành Fanpage trọn gói cho SME";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Ảnh chia sẻ khi gửi link lên Facebook / Zalo: logo gốc (chữ đã outline) trên nền tối của trang. */
export default async function OpengraphImage() {
  const img = await readFile(join(process.cwd(), "public/brand/og-thumbnail.jpg"));
  const src = `data:image/jpeg;base64,${img.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090B",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={1200} height={630} style={{ objectFit: "cover" }} alt="" />
      </div>
    ),
    size,
  );
}
