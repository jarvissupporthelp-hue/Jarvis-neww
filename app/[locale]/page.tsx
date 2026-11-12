/* eslint-disable @next/next/no-html-link-for-pages -- Locale changes must reload the root document to update its lang attribute. */
import { notFound } from "next/navigation";
import { isLocale, landing } from "@/lib/locales";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = landing[locale];

  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl content-center px-6 py-16 sm:px-12">
      {/* Full navigation refreshes the root document language. */}
      <nav aria-label={copy.language} className="mb-8 flex gap-4">
        <a href="/hy" hrefLang="hy" lang="hy" aria-current={locale === "hy" ? "page" : undefined}>Հայերեն</a>
        <a href="/en" hrefLang="en" lang="en" aria-current={locale === "en" ? "page" : undefined}>English</a>
      </nav>
      <p className="mb-5 text-sm font-semibold tracking-widest uppercase">{copy.pilot}</p>
      <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">{copy.brand}</h1>
      <p className="mt-5 max-w-xl text-xl sm:text-2xl">{copy.description}</p>
      <p className="mt-8 max-w-xl border-l-2 border-[#53745f] pl-4">{copy.invitation}</p>
      <a href={`/account?lang=${locale}`} className="mt-5 w-fit font-semibold underline">{copy.signIn}</a>
    </main>
  );
}
