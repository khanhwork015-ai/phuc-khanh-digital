import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PinGateOverlay } from "@/components/auth/PinGateOverlay";
import { PortalClient } from "@/components/portal/PortalClient";
import { getSessionUser } from "@/lib/auth";
import { isDashboardRole } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Cổng Khách Hàng",
  robots: { index: false, follow: false },
};

export default async function PortalPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/portal");
  }
  if (isDashboardRole(user.role)) {
    redirect("/dashboard");
  }

  return (
    <PinGateOverlay initialHasPin={user.hasPin} username={user.username} portalLabel="Cổng duyệt bài khách hàng">
      <PortalClient username={user.username} />
    </PinGateOverlay>
  );
}
