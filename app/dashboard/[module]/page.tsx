import { notFound } from "next/navigation";
import * as registeredModules from "@/lib/foundation/registry";
import { Dashboard } from "../dashboard";

export default async function ModulePage({ params }: PageProps<"/dashboard/[module]">) {
  const { module } = await params;
  if (!Object.values(registeredModules).some((entry) => entry.key === module && "Page" in entry)) notFound();
  return <Dashboard moduleKey={module} />;
}
