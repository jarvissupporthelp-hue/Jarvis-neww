import Link from "next/link";
import { books } from "@/modules/campus/books";
import { digitalLibrary } from "@/lib/locales";
import { ResourceWorkspace } from "./workspace";

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const { lang } = await searchParams;
  const locale = lang === "hy" ? "hy" : "en";
  const library = digitalLibrary[locale];
  const address = `/campus?tab=library&lang=${locale}`;
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <Link href="/account" className="font-semibold underline">Back to account</Link>
      <h1 className="text-3xl font-semibold">Course PDF library</h1>
      <aside className="rounded-xl border border-[#dbe6dc] bg-[#eef3ee] p-4">
        <Link href={address} className="font-semibold underline">{library.title} · {library.books(books.length)}</Link>
        <p className="mt-1 text-sm text-slate-700">{library.courseLibraryHelp}</p>
      </aside>
      <ResourceWorkspace />
    </main>
  );
}
