import { notFound } from "next/navigation";
import { AcademicsWorkspace } from "@/modules/academics/workspace";
import { pages } from "@/modules/academics/routes";
import { courses } from "@/modules/academics/demo";

export default async function AcademicsPage({ params }: PageProps<"/academics/[[...section]]">) {
  const { section = [] } = await params;
  const [page = "overview", code] = section;
  if (!pages.some((entry) => entry.key === page) || section.length > 2
    || (code && (page !== "courses" || !courses.some((course) => course.code === code)))) notFound();
  return <AcademicsWorkspace page={page} code={code} />;
}
