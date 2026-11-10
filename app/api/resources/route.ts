import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { hasPdfMarkers, maxPdfBytes } from "@/lib/course-resources";

const bucket = "course-pdfs";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
const listFields = "id,offering_id,title,filename,size_bytes";

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

function storageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function access(request: Request, roles: ("lecturer" | "student")[]) {
  const caller = await authorize(request, roles);
  if (!caller.ok) return reply({ error: "Authorized course access required." }, caller.status);
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  return client ? { client, userId: caller.userId } : reply({ error: "Course resources unavailable." }, 503);
}

export async function GET(request: Request) {
  const auth = await access(request, ["student", "lecturer"]);
  if (auth instanceof Response) return auth;
  const params = new URL(request.url).searchParams;
  const id = params.get("file");
  const offering = params.get("course");
  if (id !== null) {
    if (!uuid.test(id)) return reply({ error: "PDF not found." }, 404);
    const { data, error } = await auth.client.from("course_resources")
      .select("object_key,filename").eq("id", id).maybeSingle();
    if (error) return reply({ error: "Could not load the PDF." }, 503);
    if (!data) return reply({ error: "PDF not found." }, 404);
    const admin = storageAdmin();
    if (!admin) return reply({ error: "Course resources unavailable." }, 503);
    const result = await admin.storage.from(bucket).download(data.object_key);
    if (result.error) return reply({ error: "Could not open the PDF." }, 503);
    return new Response(result.data, {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=course-resource.pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (offering === null) {
    const { data, error } = await auth.client.from("course_offerings")
      .select("id,course:courses!inner(name),group:student_groups!inner(name),semester:semesters!inner(name)").order("id");
    return error ? reply({ error: "Could not load your courses." }, 503) : reply({ courses: data });
  }
  if (!uuid.test(offering)) return reply({ error: "Course not found." }, 404);
  const { data: course, error: courseError } = await auth.client.from("course_offerings")
    .select("id").eq("id", offering).maybeSingle();
  if (courseError) return reply({ error: "Could not load the course." }, 503);
  if (!course) return reply({ error: "Course not found." }, 404);
  const { data, error } = await auth.client.from("course_resources").select(listFields)
    .eq("offering_id", offering).order("published_at", { ascending: false }).order("id");
  return error ? reply({ error: "Could not load course resources." }, 503) : reply({ resources: data });
}

export async function POST(request: Request) {
  const auth = await access(request, ["lecturer"]);
  if (auth instanceof Response) return auth;
  if (Number(request.headers.get("content-length")) > maxPdfBytes + 65_536) {
    return reply({ error: "Choose a PDF up to 4 MB." }, 413);
  }
  const form = await request.formData().catch(() => null);
  const id = form?.get("id");
  const offering = form?.get("offeringId");
  const title = form?.get("title");
  const file = form?.get("pdf");
  if (typeof id !== "string" || !uuid.test(id) || typeof offering !== "string" || !uuid.test(offering)
    || typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return reply({ error: "Enter a resource title and choose a course." }, 400);
  }
  if (!(file instanceof File) || !/\.pdf$/i.test(file.name) || file.name.length > 180
    || /[\x00-\x1f\x7f]/.test(file.name) || (file.type && file.type !== "application/pdf")) {
    return reply({ error: "Choose a PDF file." }, 400);
  }
  if (!file.size || file.size > maxPdfBytes) return reply({ error: "Choose a nonempty PDF up to 4 MB." }, 413);

  const assignment = await auth.client.from("lecturer_assignments").select("course_offering_id")
    .eq("course_offering_id", offering).maybeSingle();
  if (assignment.error) return reply({ error: "Could not verify teaching access." }, 503);
  if (!assignment.data) return reply({ error: "You can publish only for a course group you teach." }, 403);
  const bytes = await file.arrayBuffer();
  if (!hasPdfMarkers(new Uint8Array(bytes))) return reply({ error: "This file does not look like a complete PDF." }, 400);
  const admin = storageAdmin();
  if (!admin) return reply({ error: "Course resources unavailable." }, 503);

  const digest = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
  const key = `${id.toLowerCase()}/${digest}.pdf`;
  const upload = await admin.storage.from(bucket).upload(key, bytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) return reply({ error: "Could not store the PDF. Try again." }, 503);

  const { error } = await admin.rpc("publish_course_resource", {
    p_id: id, p_offering_id: offering, p_publisher: auth.userId, p_title: title.trim(),
    p_filename: file.name, p_size: file.size, p_object_key: key,
  });
  if (error?.code === "42501") return reply({ error: "You can publish only for a course group you teach." }, 403);
  if (error?.code === "23505") return reply({ error: "This upload was already used for another resource. Select the PDF again." }, 409);
  if (error) return reply({ error: "Could not publish the PDF. Retry with the same file and title." }, 503);
  return reply({ id, offering_id: offering, title: title.trim(), filename: file.name, size_bytes: file.size }, 201);
}
