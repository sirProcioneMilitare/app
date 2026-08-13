import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";

export default async function RegiaPage() {
  const role = await getSessionRole();

  if (!role) redirect("/login");
  if (role === "him") redirect("/oggi");

  return <div>Regia — in arrivo.</div>;
}
