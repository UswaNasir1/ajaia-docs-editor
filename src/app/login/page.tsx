import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Ajaia Docs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to open your collaborative documents
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
