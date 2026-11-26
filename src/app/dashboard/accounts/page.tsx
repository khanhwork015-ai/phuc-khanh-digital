import { AccountsClient } from "@/components/dashboard/AccountsClient";
import { getSessionUser } from "@/lib/auth";
import { canManageAccounts } from "@/lib/permissions";

export default async function DashboardAccountsPage() {
  const user = await getSessionUser();
  return <AccountsClient canEdit={user ? canManageAccounts(user.role) : false} />;
}
