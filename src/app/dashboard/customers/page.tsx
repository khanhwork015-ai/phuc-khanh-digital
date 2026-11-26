import { CustomersClient } from "@/components/dashboard/CustomersClient";
import { getSessionUser } from "@/lib/auth";
import { canManageCustomers } from "@/lib/permissions";

export default async function DashboardCustomersPage() {
  const user = await getSessionUser();
  return <CustomersClient canEdit={user ? canManageCustomers(user.role) : false} />;
}
