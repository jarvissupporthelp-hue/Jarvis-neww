
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";
import { learningCourses } from "@/modules/learning/seed";
import { FocusWorkspace } from "./workspace";

export default async function FocusPage({ searchParams }: PageProps<"/focus">) {
  const { course } = await searchParams;
  const courseLabel = learningCourses.find(entry => entry.code === course)?.title;
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <Link href="/account" className="font-semibold underline"><UiText value="Back to dashboard"/></Link>
      <h1 className="text-3xl font-semibold"><UiText value="Focus timer"/></h1>
      <p><UiText value="Set a focus block or take a short break. Completed focus blocks are saved to your account."/></p>
      <FocusWorkspace courseLabel={courseLabel} />
    </main>
  );
}
