import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageAccounts,
  canManageContent,
  canManageCustomers,
  canManageLeads,
  isDashboardRole,
} from "./permissions.ts";

test("Ma trận phân quyền 4 vai trò hoạt động chính xác", () => {
  assert.equal(isDashboardRole("ADMIN"), true);
  assert.equal(isDashboardRole("DIRECTOR"), true);
  assert.equal(isDashboardRole("MODERATOR"), true);
  assert.equal(isDashboardRole("CUSTOMER"), false);

  assert.equal(canManageContent("ADMIN"), true);
  assert.equal(canManageContent("DIRECTOR"), false);
  assert.equal(canManageContent("MODERATOR"), false);

  assert.equal(canManageLeads("ADMIN"), true);
  assert.equal(canManageLeads("DIRECTOR"), false);
  assert.equal(canManageLeads("MODERATOR"), false);

  assert.equal(canManageCustomers("ADMIN"), true);
  assert.equal(canManageCustomers("MODERATOR"), true);
  assert.equal(canManageCustomers("DIRECTOR"), false);
  assert.equal(canManageCustomers("CUSTOMER"), false);

  assert.equal(canManageAccounts("ADMIN"), true);
  assert.equal(canManageAccounts("MODERATOR"), false);
  assert.equal(canManageAccounts("DIRECTOR"), false);
});
