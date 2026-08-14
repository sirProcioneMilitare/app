import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";
import { RegiaView } from "@/components/regia/regia-view";

export default async function RegiaPage() {
  const role = await getSessionRole();

  if (!role) redirect("/login");
  if (role === "him") redirect("/oggi");

  return <RegiaView />;
}
