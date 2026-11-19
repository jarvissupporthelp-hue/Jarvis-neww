import { notFound, redirect } from "next/navigation";
import { pages } from "@/modules/academics/routes";
import { offeringIdPattern } from "@/modules/academics/portal-types";
import { AcademicPortal } from "@/modules/academics/portal";

export default async function AcademicsPage({ params, searchParams }: PageProps<"/academics/[[...section]]">) {
  const [{ section = [] }, query] = await Promise.all([params, searchParams]);
  const locale = query.lang === "en" ? "en" : "hy";
  const [page = "overview", offering] = section;
  if (!pages.some(({ key }) => key === page) || section.length > 2 || (offering && page !== "courses")) notFound();

  if (page === "timetable") redirect(`/account/calendar?lang=${locale}`);
  if (page === "assignments") redirect(`/account?lang=${locale}`);
  if (offering && !offeringIdPattern.test(offering)) redirect(`/academics/demo/courses/${encodeURIComponent(offering)}`);
  if (page !== "overview" && page !== "courses") redirect(`/academics/demo/${page}`);

  return <AcademicPortal key={offering ?? page} locale={locale} offeringId={offering} />;
}
