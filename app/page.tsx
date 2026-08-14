import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";

export default async function RootPage() {
  const role = await getSessionRole();

  if (!role) redirect("/login");
  redirect("/calendario");
}
