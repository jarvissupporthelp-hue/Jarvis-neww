import { AccountScreen } from "./account-screen";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const locale = (await searchParams).lang === "hy" ? "hy" : "en";
  return <AccountScreen view="dashboard" locale={locale} />;
}
