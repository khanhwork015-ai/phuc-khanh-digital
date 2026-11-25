import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractBellShapes } from "./bell-shapes.ts";

const svgText = readFileSync(new URL("../../../public/brand/logo-mark.svg", import.meta.url), "utf8");

test("tách đúng 12 hình có tô màu từ logo chuông", () => {
  const { svg } = extractBellShapes(svgText);
  assert.equal((svg.match(/<path\b/g) ?? []).length, 12);
});

test("không còn gradient, nét không tô hay filter (SVGLoader không hiểu được)", () => {
  const { svg } = extractBellShapes(svgText);
  assert.ok(!svg.includes("url(#"), "còn fill url(#...)");
  assert.ok(!svg.includes('fill="none"'), 'còn fill="none"');
  assert.ok(!svg.includes("filter="), "còn filter=");
});

test("giữ id hai chữ P và K để đùn dày hơn", () => {
  const { svg, letterIds } = extractBellShapes(svgText);
  assert.deepEqual(letterIds, ["letter-p", "letter-k"]);
  assert.ok(svg.includes('id="letter-p"') && svg.includes('id="letter-k"'));
});

test("giữ nguyên viewBox gốc", () => {
  const { svg } = extractBellShapes(svgText);
  assert.ok(svg.includes('viewBox="430 104 656 538"'));
});
