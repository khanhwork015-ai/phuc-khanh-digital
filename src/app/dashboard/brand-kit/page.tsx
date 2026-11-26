import { BrandAssetsClient } from "@/components/dashboard/BrandAssetsClient";
import { getSessionUser } from "@/lib/auth";
import { canManageCustomers } from "@/lib/permissions";

export default async function DashboardBrandKitPage() {
  const user = await getSessionUser();
  return <BrandAssetsClient canEdit={user ? canManageCustomers(user.role) : false} />;
}
