
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";
import { PracticeCatalog } from "./practice";
import { QuizWorkspace } from "./workspace";

export default function QuizzesPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Link className="font-semibold underline" href="/account"><UiText value="Back to dashboard"/></Link>
      <h1 className="text-3xl font-semibold"><UiText value="Practice quizzes"/></h1>
      <PracticeCatalog />
      <details className="jarvis-panel">
        <summary className="cursor-pointer font-semibold"><UiText value="Course quizzes"/></summary>
        <div className="mt-4"><QuizWorkspace /></div>
      </details>
    </main>
  );
}
