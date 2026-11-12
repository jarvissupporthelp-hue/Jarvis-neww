import { AccountScreen } from "../account-screen";

export default async function CalendarPage({ searchParams }: PageProps<"/account/calendar">) {
  const locale = (await searchParams).lang === "hy" ? "hy" : "en";
  return <AccountScreen view="calendar" locale={locale} />;
}
