import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getSessionUser } from "@/lib/auth/session";
import { listDocuments } from "@/lib/services/documents";

// Auth + DB reads are per-request; allow blocking navigation for this route.
export const instant = false;

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const docs = await listDocuments(user.id);

  return (
    <Dashboard
      userName={user.name}
      userEmail={user.email}
      initialOwned={docs.owned}
      initialShared={docs.shared}
    />
  );
}
