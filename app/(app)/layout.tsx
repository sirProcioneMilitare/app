import { redirect } from "next/navigation";
import { altroRuolo, getSessionRole, nomeDi } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getSessionRole();
  if (!role) redirect("/login");

  const altro = altroRuolo(role);
  const me = {
    role,
    nome: nomeDi(role),
    altro: { role: altro, nome: nomeDi(altro) },
  };

  return <AppShell me={me}>{children}</AppShell>;
}
