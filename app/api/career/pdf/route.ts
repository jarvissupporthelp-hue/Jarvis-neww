import { authorize } from "@/lib/authorization";
import { buildCvPdf } from "@/modules/career/pdf";
import { text, CareerInput } from "@/modules/career/profile";
import { cvFields, emptyCv, sampleCv } from "@/modules/career/rules";

const response = async (cv: typeof emptyCv) => new Response(new Uint8Array(await buildCvPdf(cv)), { headers: {
  "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="jarvis-cv.pdf"', "Cache-Control": "private, no-store",
} });

export async function GET() {
  return response(sampleCv);
}

export async function POST(request: Request) {
  const identity = await authorize(request, ["student"]);
  if (!identity.ok) return new Response("Sign in to export your CV.", { status: identity.status });
  try {
    const input = await request.json();
    const cv = { ...emptyCv };
    for (const field of cvFields) cv[field] = text(input?.[field], 2200);
    return await response(cv);
  } catch (error) {
    return new Response("Could not export the CV.", { status: error instanceof CareerInput ? 400 : 503 });
  }
}
