import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();

  if (!role) redirect("/login");
  if (role === "her") redirect("/regia");

  return <AppShell>{children}</AppShell>;
}
