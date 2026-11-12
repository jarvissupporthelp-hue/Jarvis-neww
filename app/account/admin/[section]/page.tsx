import { notFound } from "next/navigation";
import { AccountScreen } from "../../account-screen";
import type { AdminSection } from "../../admin-workspace";

const sections: readonly AdminSection[] = ["users", "group", "semester", "course", "offering", "timetable", "audit"];

export default async function AdminSectionPage({ params, searchParams }: PageProps<"/account/admin/[section]">) {
  const { section } = await params;
  const locale = (await searchParams).lang === "hy" ? "hy" : "en";
  if (!sections.some((item) => item === section)) notFound();
  return <AccountScreen adminSection={section as AdminSection} locale={locale} />;
}
