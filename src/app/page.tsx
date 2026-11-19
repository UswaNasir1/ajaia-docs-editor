import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-lg border border-border p-4">
        <h2 className="font-medium">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Document list placeholder — owned and shared docs come next.
        </p>
      </section>
    </main>
  );
}
