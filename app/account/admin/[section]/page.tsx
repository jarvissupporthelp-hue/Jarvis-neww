import { notFound } from "next/navigation";
import { AccountScreen } from "../../account-screen";
import type { AdminSection } from "../../admin-workspace";

const sections: readonly AdminSection[] = ["users", "group", "semester", "course", "offering", "timetable", "audit"];

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.some((item) => item === section)) notFound();
  return <AccountScreen adminSection={section as AdminSection} />;
}
