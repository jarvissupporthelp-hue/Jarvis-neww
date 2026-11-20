
import {UiText} from "@/app/components/interface-language";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CampusWorkspace } from "@/modules/campus/workspace";

export default async function CampusPage({ searchParams }: PageProps<"/campus">) {
  const { tab, lang } = await searchParams;
  if (tab === "library") {
    const language = typeof lang === "string" && ["hy", "en", "fr", "ru"].includes(lang) ? "?lang=" + lang : "?lang=hy";
    redirect("/library/digital" + language);
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[#426852] underline underline-offset-4"><UiText value="JARVIS home"/></Link>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl"><UiText value="Campus Resources"/></h1>
      <p className="mt-3 text-slate-600">Find a study room or plan a team session.</p>
      <CampusWorkspace />
    </main>
  );
}
