import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { hasPdfMarkers, maxPdfBytes } from "@/lib/course-resources";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: object, status = 200) => Response.json(body, { status, headers });

async function access(request: Request) {
  const caller = await authorize(request, ["lecturer"]);
  if (!caller.ok) return { response: reply({ error: "Active lecturer access required." }, caller.status) };
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  return client ? { client, userId: caller.userId } : { response: reply({ error: "Private workspace unavailable." }, 503) };
}

export async function GET(request: Request) {
  const auth = await access(request);
  if ("response" in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const fileId = params.get("file");
  if (fileId !== null) {
    if (!uuid.test(fileId)) return reply({ error: "File not found." }, 404);
    const { data, error } = await auth.client.rpc("read_private_lecturer_pdf", { p_id: fileId });
    if (error || !data) return reply({ error: "File not found." }, 404);
    return new Response(Uint8Array.from(Buffer.from(data, "base64")), {
      headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=private-lecturer.pdf", "X-Content-Type-Options": "nosniff" },
    });
  }
  const offeringId = params.get("course") ?? "";
  if (!uuid.test(offeringId)) return reply({ error: "Choose an assigned course." }, 400);
  const assignment = await auth.client.from("lecturer_assignments").select("lecturer_id")
    .eq("lecturer_id", auth.userId).eq("course_offering_id", offeringId).maybeSingle();
  if (assignment.error) return reply({ error: "Could not load the private workspace." }, 503);
  if (!assignment.data) return reply({ error: "Assigned course not found." }, 404);
  const [notes, files] = await Promise.all([
    auth.client.from("lecturer_ai_notes").select("id,title,content,updated_at").eq("offering_id", offeringId).order("updated_at", { ascending: false }),
    auth.client.from("lecturer_private_files").select("id,title,filename,created_at").eq("offering_id", offeringId).order("created_at", { ascending: false }),
  ]);
  if (notes.error || files.error) return reply({ error: "Could not load private materials." }, 503);
  return reply({ notes: notes.data, files: files.data });
}

export async function POST(request: Request) {
  const auth = await access(request);
  if ("response" in auth) return auth.response;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    if (Number(request.headers.get("content-length")) > maxPdfBytes + 65_536) return reply({ error: "Choose a PDF up to 4 MB." }, 413);
    const form = await request.formData().catch(() => null);
    const offeringId = form?.get("offeringId"), title = form?.get("title"), file = form?.get("pdf");
    if (typeof offeringId !== "string" || !uuid.test(offeringId) || typeof title !== "string" || !title.trim() || title.length > 120
      || !(file instanceof File) || !/\.pdf$/i.test(file.name) || file.name.length > 180 || /[\x00-\x1f\x7f]/.test(file.name)
      || !file.size || file.size > maxPdfBytes) return reply({ error: "Choose a title and a PDF up to 4 MB." }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfMarkers(bytes)) return reply({ error: "This is not a complete PDF." }, 400);
    const id = crypto.randomUUID();
    const { error } = await auth.client.rpc("publish_private_lecturer_pdf", {
      p_id: id, p_offering_id: offeringId, p_title: title.trim(), p_filename: file.name,
      p_base64: Buffer.from(bytes).toString("base64"),
    });
    if (error?.code === "42501") return reply({ error: "You cannot add files for this course." }, 403);
    if (error) return reply({ error: "Could not save the private PDF." }, 503);
    return reply({ file: { id, title: title.trim(), filename: file.name } }, 201);
  }

  const input = await request.json().catch(() => null);
  if (!input || !uuid.test(input.offeringId ?? "") || typeof input.title !== "string" || !input.title.trim() || input.title.length > 120
    || typeof input.content !== "string" || !input.content.trim() || input.content.length > 12000) {
    return reply({ error: "Enter a title and a note of up to 12,000 characters." }, 400);
  }
  const { data, error } = await auth.client.from("lecturer_ai_notes")
    .insert({ offering_id: input.offeringId, title: input.title.trim(), content: input.content.trim() })
    .select("id,title,content,updated_at").single();
  if (error?.code === "42501") return reply({ error: "You cannot add notes for this course." }, 403);
  if (error) return reply({ error: "Could not save the private note." }, 503);
  return reply({ note: data }, 201);
}

export async function DELETE(request: Request) {
  const auth = await access(request);
  if ("response" in auth) return auth.response;
  const input = await request.json().catch(() => null);
  if (!uuid.test(input?.id ?? "") || !["note", "file"].includes(input?.kind)) return reply({ error: "Choose a private item." }, 400);
  const table = input.kind === "note" ? "lecturer_ai_notes" : "lecturer_private_files";
  const { data, error } = await auth.client.from(table).delete().eq("id", input.id).select("id");
  if (error) return reply({ error: "Could not remove the private item." }, 503);
  if (!data?.length) return reply({ error: "Private item not found." }, 404);
  return reply({ removed: input.id });
}
