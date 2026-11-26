import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalClient } from "@/components/portal/PortalClient";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cổng Khách Hàng",
  robots: { index: false, follow: false },
};

export default async function PortalPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/portal");
  }
  if (user.role === "ADMIN") {
    redirect("/dashboard");
  }

  return <PortalClient username={user.username} />;
}
