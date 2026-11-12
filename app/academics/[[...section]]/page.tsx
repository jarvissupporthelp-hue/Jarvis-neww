import { notFound } from "next/navigation";
import { AcademicsWorkspace } from "@/modules/academics/workspace";
import { pages } from "@/modules/academics/routes";
import { courseCatalog } from "@/modules/academics/demo";

export default async function AcademicsPage({ params, searchParams }: PageProps<"/academics/[[...section]]">) {
  const { section = [] } = await params;
  const [page = "overview", code] = section;
  if (!pages.some((entry) => entry.key === page) || section.length > 2
    || (code && (page !== "courses" || !courseCatalog.some((course) => course.code === code)))) notFound();
  const { date } = await searchParams;
  const initialDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date ? date : undefined;
  return <AcademicsWorkspace key={initialDate} page={page} code={code} initialDate={initialDate} />;
}
