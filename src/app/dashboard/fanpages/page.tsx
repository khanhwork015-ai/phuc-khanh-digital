import { FanpagesClient } from "@/components/dashboard/FanpagesClient";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardFanpagesPage() {
  const user = await getSessionUser();
  return <FanpagesClient canToggle={user?.role === "ADMIN"} />;
}
