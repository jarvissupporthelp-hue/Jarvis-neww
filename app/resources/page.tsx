import Link from "next/link";
import { ResourceWorkspace } from "./workspace";

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <Link href="/account" className="font-semibold underline">Back to account</Link>
      <h1 className="text-3xl font-semibold">Course PDF library</h1>
      <ResourceWorkspace />
    </main>
  );
}
