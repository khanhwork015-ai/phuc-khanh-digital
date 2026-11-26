import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Quản trị hệ thống",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (user.role !== "ADMIN") {
    redirect("/portal");
  }

  return <DashboardShell username={user.username}>{children}</DashboardShell>;
}
