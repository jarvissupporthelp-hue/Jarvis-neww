import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { askLecturerAI, resolveProviderAccess } from "@/lib/study-ai";
import { extractCoursePages } from "@/lib/course-pdf-index";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const caller = await authorize(request, ["lecturer"]);
  if (!caller.ok) return reply({ error: "Active lecturer access required." }, caller.status);
  const input = await request.json().catch(() => null);
  const prompt: string = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  const offeringId = input?.offeringId;
  const fileId = input?.fileId;
  if (!uuid.test(offeringId ?? "") || !prompt || prompt.length > 2000 || input?.consent !== true
    || (fileId && !uuid.test(fileId))) return reply({ error: "Choose a course, enter a question, and confirm AI data use." }, 400);
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  if (!client) return reply({ error: "Lecturer AI unavailable." }, 503);

  const assignment = await client.from("lecturer_assignments")
    .select("course_offering_id,course:course_offerings!inner(course:courses!inner(name))")
    .eq("lecturer_id", caller.userId).eq("course_offering_id", offeringId).maybeSingle();
  if (assignment.error) return reply({ error: "Could not check course access." }, 503);
  if (!assignment.data) return reply({ error: "Assigned course not found." }, 404);
  const relation = assignment.data.course as unknown as { course: { name: string } };
  const course = relation?.course?.name ?? "Assigned course";
  const material: string[] = [];

  if (input.includeNotes === true) {
    const { data, error } = await client.from("lecturer_ai_notes")
      .select("title,content").eq("offering_id", offeringId).order("updated_at", { ascending: false }).limit(8);
    if (error) return reply({ error: "Could not load private notes." }, 503);
    for (const note of data ?? []) material.push(`Private note: ${note.title}\n${note.content.slice(0, 1500)}`);
  }
  if (fileId) {
    const file = await client.from("lecturer_private_files").select("id,title")
      .eq("id", fileId).eq("offering_id", offeringId).maybeSingle();
    if (file.error || !file.data) return reply({ error: "Private PDF not found." }, 404);
    const { data: base64, error } = await client.rpc("read_private_lecturer_pdf", { p_id: fileId });
    if (error || typeof base64 !== "string" || !base64) return reply({ error: "Could not read private PDF." }, 503);
    const pages = await extractCoursePages(Uint8Array.from(Buffer.from(base64, "base64")));
    const terms = new Set((prompt.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []));
    const ranked = pages.map((page) => ({ ...page, score: [...terms].filter((term) => page.text.toLowerCase().includes(term)).length }))
      .sort((a, b) => b.score - a.score || a.page - b.page).slice(0, 3);
    for (const page of ranked) material.push(`PDF ${file.data.title}, page ${page.page}:\n${page.text.slice(0, 1800)}`);
  }

  const provider = resolveProviderAccess(request);
  if ("error" in provider) return reply({ error: provider.error }, 503);
  const answer = await askLecturerAI(prompt, provider.credential, course, material.join("\n\n").slice(0, 14000));
  return answer ? reply({ answer }) : reply({ error: "The AI provider did not respond. Try again." }, 502);
}
