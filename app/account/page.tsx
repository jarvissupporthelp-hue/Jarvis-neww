import { accountCopy } from "@/lib/foundation/copy";
import { AccountForm } from "./account-form";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const locale = (await searchParams).lang === "hy" ? "hy" : "en";
  return (
    <main lang={locale} className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="mb-6 text-4xl font-semibold">{accountCopy[locale].heading}</h1>
      <AccountForm locale={locale} />
    </main>
  );
}
