
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";
import { QuizWorkspace } from "./workspace";

export default function QuizzesPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <Link className="font-semibold underline" href="/account"><UiText value="Back to dashboard"/></Link>
      <h1 className="text-3xl font-semibold"><UiText value="Course quizzes"/></h1>
      <p>Try a short practice quiz to see which topics to review. Your results are for this attempt.</p>
      <QuizWorkspace />
    </main>
  );
}
