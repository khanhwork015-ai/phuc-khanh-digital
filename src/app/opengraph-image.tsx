import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Phúc Khánh Digital - Vận hành Fanpage trọn gói cho SME";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Ảnh chia sẻ khi gửi link lên Facebook / Zalo: logo gốc (chữ đã outline) trên nền tối của trang. */
export default async function OpengraphImage() {
  const svg = await readFile(join(process.cwd(), "public/brand/logo-full.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;

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
          backgroundImage: "radial-gradient(circle at 50% 42%, rgba(233,190,87,0.16), rgba(9,9,11,0) 60%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={620} height={424} alt="" />
      </div>
    ),
    size,
  );
}
