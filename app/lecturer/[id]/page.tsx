import Link from "next/link";
import { LecturerWorkspace } from "../workspace";

export default async function LecturerCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <Link href="/lecturer" className="font-semibold underline">Back to lecturer workspace</Link>
      <LecturerWorkspace key={id} offeringId={id} />
    </main>
  );
}
