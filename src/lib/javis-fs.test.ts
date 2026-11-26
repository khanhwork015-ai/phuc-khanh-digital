import assert from "node:assert/strict";
import test from "node:test";
import {
  parseApprovalQueueMarkdown,
  parseCustomersMarkdown,
  removeCustomerRowInMarkdown,
  updateApprovalRowInMarkdown,
  upsertCustomerRowInMarkdown,
} from "./javis-markdown.ts";

const sampleCustomersMd = `---
type: registry
updated: 2026-11-25
---

# Sổ Tổng Danh Sách Fanpage

| STT | Slug | Tên Fanpage | Page ID | Trạng thái | Hợp đồng | Phụ trách | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | \`shin-aios\` | SHIN AIOS | \`2115722604948187\` | \`active\` | 10 bài/tháng (content + ảnh) | \`brain-agency-manager\` | Đã chốt Cổng hỏi 1 |
`;

const sampleQueueMd = `---
type: approval-queue
updated: 2026-11-26
---

# Sổ Tổng Bài Đang Xử Lý

| STT | Fanpage | Mã bài | Tiêu đề | Trạng thái | Giờ đăng | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | SHIN AIOS | \`05-khao-sat-khau-ket-khi-lam-fanpage\` | Khảo sát nhỏ | \`Chờ duyệt\` | 2026-11-25 20:30 | - |
| 2 | SHIN AIOS | \`06-cong-chan-du-kien-that-khong-bia-so\` | Thiếu giá và địa chỉ thật | \`Chờ đăng\` | 2026-11-26 20:00 | - |
`;

test("parseCustomersMarkdown đọc đúng bảng _khach-hang.md của Javis", () => {
  const rows = parseCustomersMarkdown(sampleCustomersMd);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, "shin-aios");
  assert.equal(rows[0].businessName, "SHIN AIOS");
  assert.equal(rows[0].pageId, "2115722604948187");
  assert.equal(rows[0].contractStatus, "active");
});

test("parseApprovalQueueMarkdown và updateApprovalRowInMarkdown xử lý đúng bảng _cho-duyet.md", () => {
  const rows = parseApprovalQueueMarkdown(sampleQueueMd);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].itemCode, "05-khao-sat-khau-ket-khi-lam-fanpage");
  assert.equal(rows[0].status, "pending_review");
  assert.equal(rows[1].status, "scheduled");

  const updated = updateApprovalRowInMarkdown(
    sampleQueueMd,
    "05-khao-sat-khau-ket-khi-lam-fanpage",
    "approved",
    "OK đăng 20:30 nhé",
  );
  assert.equal(updated.updated, true);
  assert.match(updated.content, /`Đã duyệt`/);
  assert.match(updated.content, /OK đăng 20:30 nhé/);
});

test("upsertCustomerRowInMarkdown và removeCustomerRowInMarkdown đồng bộ 2 chiều _khach-hang.md", () => {
  const added = upsertCustomerRowInMarkdown(sampleCustomersMd, {
    slug: "tiem-banh-an",
    businessName: "Tiệm Bánh An",
    contractStatus: "active",
    contractSummary: "Gói Tăng Trưởng",
    notes: "Ký offline",
  });
  assert.equal(added.updated, true);
  assert.match(added.content, /\| 2 \| `tiem-banh-an` \| Tiệm Bánh An \|/);

  const modified = upsertCustomerRowInMarkdown(added.content, {
    slug: "tiem-banh-an",
    businessName: "Tiệm Bánh An Pro",
    contractStatus: "paused",
  });
  assert.match(modified.content, /Tiệm Bánh An Pro/);
  assert.match(modified.content, /`paused`/);

  const removed = removeCustomerRowInMarkdown(modified.content, "tiem-banh-an");
  assert.equal(removed.removed, true);
  assert.doesNotMatch(removed.content, /tiem-banh-an/);
});
