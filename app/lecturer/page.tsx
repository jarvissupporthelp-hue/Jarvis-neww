import Link from "next/link";
import { LecturerWorkspace } from "./workspace";

export default function LecturerPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <Link href="/account" className="font-semibold underline">Back to account</Link>
      <h1 className="text-3xl font-semibold">Lecturer workspace</h1>
      <LecturerWorkspace />
    </main>
  );
}
