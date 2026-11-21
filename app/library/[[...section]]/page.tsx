import { ReaderLoans } from "@/modules/campus/reader-loans";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { UiText } from "@/app/components/interface-language";
import { DigitalLibrary } from "@/modules/campus/discovery";
import { PhysicalLibrary, type PhysicalBook } from "@/modules/campus/physical-library";

async function physicalCatalog() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } })
    .from("physical_library_books").select("id,title,author,category,language,faculties,shelf,expected_return")
    .order("title").abortSignal(AbortSignal.timeout(5000)).returns<PhysicalBook[]>();
  return error ? null : data;
}

export default async function LibraryPage({ params, searchParams }: PageProps<"/library/[[...section]]">) {
  const [{ section = [] }, query, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  if (!section.length) {
    const lang = typeof query.lang === "string" && ["hy", "en", "fr", "ru"].includes(query.lang) ? "?lang=" + query.lang : "";
    redirect("/library/digital" + lang);
  }
  if (section.length !== 1 || !["digital", "physical", "loans"].includes(section[0])) notFound();
  const language = requestHeaders.get("x-jarvis-locale");
  const locale = language === "hy" ? "hy" : "en";
  const linkLanguage = language === "fr" || language === "ru" ? language : locale;
  const physical = section[0] === "physical";
  const books = physical ? await physicalCatalog() : null;
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6">
    <h1 className="text-3xl font-semibold sm:text-4xl"><UiText value="Library"/></h1>
    <nav className="jarvis-section-nav library-section-nav" aria-label="Library">
      <Link href={`/library/digital?lang=${linkLanguage}`} aria-current={section[0] === "digital" ? "page" : undefined}><UiText value="Digital Library"/></Link>
      <Link href={`/library/physical?lang=${linkLanguage}`} aria-current={physical ? "page" : undefined}><UiText value="Physical Library"/></Link>
      <Link href={`/library/loans?lang=${linkLanguage}`} aria-current={section[0] === "loans" ? "page" : undefined}><UiText value="My loans"/></Link>
    </nav>
    {section[0] === "loans" ? <ReaderLoans locale={linkLanguage}/> : physical ? <PhysicalLibrary initialBooks={books} /> : <DigitalLibrary locale={locale}/>}
  </main>;
}
