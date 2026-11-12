import type { Metadata } from "next";
import Link from "next/link";
import { mathVisualization } from "@/lib/locales";
import { mathTopics } from "@/lib/math-visualizations";

export const metadata: Metadata = {
  title: "Math visualizations | JARVIS",
  description: "Interactive mathematics lab in JARVIS.",
};

export default async function MathVisualizationPage({ searchParams }: PageProps<"/math-visualization">) {
  const query = await searchParams;
  const locale = query.lang === "en" ? "en" : "hy";
  const requested = typeof query.module === "string" ? query.module : "";
  const selected = mathTopics.find((topic) => topic.id === requested);
  const copy = mathVisualization[locale];
  const labUrl = "/math-lab/index.html" + (selected ? "?module=" + selected.id : "");
  const href = (module?: string, lang = locale) => "/math-visualization?lang=" + lang + (module ? "&module=" + module : "");

  return <main className="math-page">
    <div className="math-page-header">
      <div>
        <p className="math-page-kicker">{copy.eyebrow}</p>
        <h1>{copy.title}<span aria-hidden="true">.</span></h1>
        <p className="math-page-description">{copy.description}</p>
      </div>
      <nav className="math-page-language" aria-label={copy.language}>
        <Link href={href(selected?.id, "hy")} hrefLang="hy" lang="hy" aria-current={locale === "hy" ? "page" : undefined}>Հայերեն</Link>
        <Link href={href(selected?.id, "en")} hrefLang="en" lang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
      </nav>
    </div>

    <div className="math-page-topics">
      <div className="math-page-topics-heading"><h2>{copy.topics}</h2><Link href="/learning">← {copy.back}</Link></div>
      <nav aria-label={copy.topics} className="math-topic-list">
        <Link className={!selected ? "is-selected" : ""} aria-current={!selected ? "page" : undefined} href={href()}>{copy.all}</Link>
        {mathTopics.map((topic) => <Link key={topic.id} href={href(topic.id)} aria-current={selected?.id === topic.id ? "page" : undefined} className={selected?.id === topic.id ? "is-selected" : ""}>
          <span aria-hidden="true">{topic.symbol}</span>{topic[locale]}
        </Link>)}
      </nav>
    </div>
    <div className="math-lab-frame-wrap">
      <iframe key={labUrl} className="math-lab-frame" title={copy.frame} src={labUrl} loading="eager" />
    </div>
    <p className="math-page-note">{copy.note}</p>
  </main>;
}
