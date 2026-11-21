
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";
import { PracticeCatalog } from "./practice";
import { TopicReview } from "./topic-review";
import { QuizWorkspace } from "./workspace";

export default async function QuizzesPage({ searchParams }: PageProps<"/quizzes">) {
  const { course, view } = await searchParams;
  const selectedCourse = typeof course === "string" ? course : undefined;
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Link className="font-semibold underline" href="/account"><UiText value="Back to dashboard"/></Link>
      <h1 className="text-3xl font-semibold"><UiText value="Practice quizzes"/></h1>
      <PracticeCatalog />
      <details id="topic-review" open={view === "topics" || Boolean(selectedCourse)} className="jarvis-panel scroll-mt-24">
        <summary className="cursor-pointer font-semibold"><UiText value="Topic review"/></summary>
        <div className="mt-4"><TopicReview key={selectedCourse} initialCourse={selectedCourse} /></div>
      </details>
      <details className="jarvis-panel">
        <summary className="cursor-pointer font-semibold"><UiText value="Course quizzes"/></summary>
        <div className="mt-4"><QuizWorkspace /></div>
      </details>
    </main>
  );
}
