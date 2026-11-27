import { redirect } from "next/navigation";
import { FanpageLinksPanel } from "@/components/dashboard/FanpageLinksPanel";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardConnectionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Quản trị</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Kết nối</h1>
      </div>
      <FanpageLinksPanel />
    </div>
  );
}
