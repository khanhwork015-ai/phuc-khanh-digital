import { ContentQueueClient } from "@/components/dashboard/ContentQueueClient";
import { getSessionUser } from "@/lib/auth";
import { canManageContent } from "@/lib/permissions";

export default async function DashboardContentPage() {
  const user = await getSessionUser();
  return <ContentQueueClient canEdit={user ? canManageContent(user.role) : false} />;
}
