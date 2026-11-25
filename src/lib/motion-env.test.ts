import { test } from "node:test";
import assert from "node:assert/strict";
import { allowsHeavyMotion, canUse3D, canUseLite3D, getLenisOptions, needsWebGLProbe, type MotionEnv } from "./motion-env.ts";

const desktop: MotionEnv = { reducedMotion: false, finePointer: true, width: 1440, webgl: true };
const phone: MotionEnv = { reducedMotion: false, finePointer: false, width: 375, webgl: true };

test("3D chỉ bật trên máy tính đủ điều kiện", () => {
  assert.equal(canUse3D(desktop), true);
  assert.equal(canUse3D(phone), false);
  assert.equal(canUse3D({ ...desktop, width: 1023 }), false);
  assert.equal(canUse3D({ ...desktop, webgl: false }), false);
  assert.equal(canUse3D({ ...desktop, reducedMotion: true }), false);
});

test("3D rút gọn bật trên mobile khi có WebGL và không giảm chuyển động", () => {
  assert.equal(canUseLite3D(phone), true);
  assert.equal(canUseLite3D({ ...phone, webgl: false }), false);
  assert.equal(canUseLite3D({ ...phone, reducedMotion: true }), false);
});

test("hiệu ứng nặng tắt khi giảm chuyển động hoặc màn hẹp", () => {
  assert.equal(allowsHeavyMotion(desktop), true);
  assert.equal(allowsHeavyMotion({ ...desktop, reducedMotion: true }), false);
  assert.equal(allowsHeavyMotion({ ...desktop, width: 800 }), false);
});

test("Lenis: máy tính lerp 0.09, cảm ứng syncTouch, giảm chuyển động thì tắt", () => {
  assert.equal(getLenisOptions(desktop, true)?.lerp, 0.09);
  const touch = getLenisOptions(phone, true);
  assert.equal(touch?.syncTouch, true);
  assert.equal(touch?.syncTouchLerp, 0.075);
  assert.equal(getLenisOptions(phone, false), null);
  assert.equal(getLenisOptions({ ...desktop, reducedMotion: true }, true), null);
});

test("Lenis không tự cộng offset neo (khoảng chừa Navbar chỉ lấy từ CSS scroll-padding-top)", () => {
  assert.equal(getLenisOptions(desktop, true)?.anchors, true);
  assert.equal(getLenisOptions(phone, true)?.anchors, true);
});

test("chỉ dò WebGL (tốn kém) khi các điều kiện rẻ cho 3D đã đạt", () => {
  assert.equal(needsWebGLProbe(desktop), true);
  assert.equal(needsWebGLProbe(phone), false);
  assert.equal(needsWebGLProbe({ ...desktop, width: 1023 }), false);
  assert.equal(needsWebGLProbe({ ...desktop, reducedMotion: true }), false);
});
