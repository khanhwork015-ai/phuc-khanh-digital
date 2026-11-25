/** Thêm basePath (GitHub Pages: /phuc-khanh-digital) cho đường dẫn file trong public/ khi dùng fetch hoặc <img> thường. */
export function assetPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
