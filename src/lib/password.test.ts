import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, hashSessionToken, verifyPassword } from "./password.ts";
import { createRateLimiter } from "./rate-limit.ts";

test("hashPassword tạo salt ngẫu nhiên và verifyPassword xác thực đúng", () => {
  const hash1 = hashPassword("PKstudio@1811");
  const hash2 = hashPassword("PKstudio@1811");
  assert.notEqual(hash1, hash2);
  assert.equal(verifyPassword("PKstudio@1811", hash1), true);
  assert.equal(verifyPassword("SaiMatKhau", hash1), false);
  assert.equal(verifyPassword("PKstudio@1811", "invalid-format"), false);
});

test("hashSessionToken tạo SHA-256 hex cố định 64 ký tự", () => {
  const digest = hashSessionToken("sample-token");
  assert.equal(digest.length, 64);
  assert.equal(digest, hashSessionToken("sample-token"));
  assert.notEqual(digest, "sample-token");
});

test("createRateLimiter giới hạn đúng số request trong cửa sổ thời gian", () => {
  const isLimited = createRateLimiter(60_000, 2);
  assert.equal(isLimited("127.0.0.1"), false);
  assert.equal(isLimited("127.0.0.1"), false);
  assert.equal(isLimited("127.0.0.1"), true);
  assert.equal(isLimited("10.0.0.1"), false);
});
