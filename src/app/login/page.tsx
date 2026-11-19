import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginScreen } from "./login-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return <LoginScreen />;
}
