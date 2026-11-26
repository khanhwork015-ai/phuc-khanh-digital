import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PinGateOverlay } from "@/components/auth/PinGateOverlay";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSessionUser } from "@/lib/auth";
import { isDashboardRole } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Quản trị hệ thống",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (!isDashboardRole(user.role)) {
    redirect("/portal");
  }

  return (
    <PinGateOverlay initialHasPin={user.hasPin} username={user.username} portalLabel="Bảng điều khiển quản trị">
      <DashboardShell username={user.username} role={user.role}>
        {children}
      </DashboardShell>
    </PinGateOverlay>
  );
}
