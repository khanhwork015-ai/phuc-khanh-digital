import { LeadsClient } from "@/components/dashboard/LeadsClient";
import { getSessionUser } from "@/lib/auth";
import { canManageLeads } from "@/lib/permissions";

export default async function DashboardLeadsPage() {
  const user = await getSessionUser();
  return <LeadsClient canEdit={user ? canManageLeads(user.role) : false} />;
}
