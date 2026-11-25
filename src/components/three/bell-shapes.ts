/**
 * Rút gọn logo-mark.svg thành SVG chỉ còn các hình có tô màu, để SVGLoader của three.js đùn thành khối 3D.
 * Bỏ: <defs>, nét viền không tô (fill="none"), nét phát sáng (có filter). Gradient thay bằng vàng kim phẳng
 * (chất liệu kim loại 3D tự tạo độ bóng). Viết bằng xử lý chuỗi để chạy được cả trong Node (không có DOMParser).
 */

const GOLD = "#E9BE57";

function attr(attrs: string, name: string): string | undefined {
  return new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];
}

export function extractBellShapes(svgText: string): { svg: string; letterIds: string[] } {
  const viewBox = /<svg\b[^>]*\bviewBox="([^"]+)"/.exec(svgText)?.[1] ?? "0 0 100 100";
  const body = svgText.replace(/<defs>[\s\S]*?<\/defs>/g, "");

  const groupFills: (string | undefined)[] = [];
  const kept: string[] = [];
  const letterIds: string[] = [];
  const tagRe = /<(\/?)(g|path)\b([^>]*?)(\/?)>/g;

  for (let m = tagRe.exec(body); m; m = tagRe.exec(body)) {
    const [, closing, tag, attrs, selfClosing] = m;
    if (tag === "g") {
      if (closing) groupFills.pop();
      else if (!selfClosing) groupFills.push(attr(attrs, "fill"));
      continue;
    }
    if (closing) continue;

    const inheritedFill = [...groupFills].reverse().find((f) => f !== undefined);
    const fill = attr(attrs, "fill") ?? inheritedFill;
    if (fill === "none" || attr(attrs, "filter") !== undefined) continue;

    const d = attr(attrs, "d");
    if (!d) continue;
    const id = attr(attrs, "id");
    if (id?.startsWith("letter-")) letterIds.push(id);
    kept.push(`<path${id ? ` id="${id}"` : ""} d="${d}" fill="${GOLD}"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${kept.join("")}</svg>`;
  return { svg, letterIds };
}
