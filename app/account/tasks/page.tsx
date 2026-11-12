import { AccountScreen } from "../account-screen";

export default async function TasksPage({ searchParams }: PageProps<"/account/tasks">) {
  const locale = (await searchParams).lang === "hy" ? "hy" : "en";
  return <AccountScreen view="tasks" locale={locale} />;
}
