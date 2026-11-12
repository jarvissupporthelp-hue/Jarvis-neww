import { CloudClient } from "chromadb";
import type { createStudyClient } from "./study-context";
import { extractCoursePages } from "./course-pdf-index";

type Client = NonNullable<ReturnType<typeof createStudyClient>>;
type Passage = { title: string; page: number; excerpt: string };

function configured() {
  return Boolean(process.env.CHROMA_API_KEY && process.env.CHROMA_TENANT && process.env.CHROMA_DATABASE
    && process.env.EMBEDDING_BASE_URL && process.env.EMBEDDING_API_KEY && process.env.EMBEDDING_MODEL);
}

function collection() {
  return new CloudClient({ apiKey: process.env.CHROMA_API_KEY!, tenant: process.env.CHROMA_TENANT!, database: process.env.CHROMA_DATABASE! })
    .getOrCreateCollection({ name: "jarvis_course_pages", embeddingFunction: null });
}

async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch(process.env.EMBEDDING_BASE_URL!, {
    method: "POST", headers: { Authorization: `Bearer ${process.env.EMBEDDING_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.EMBEDDING_MODEL, input: texts }),
    signal: AbortSignal.timeout(12_000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Embedding provider unavailable");
  const result = await response.json();
  return (result.data as { index: number; embedding: number[] }[]).sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function indexInChroma(resourceId: string, offeringId: string, title: string, bytes: Uint8Array) {
  if (!configured()) return false;
  const pages = await extractCoursePages(bytes);
  const chunks = pages.flatMap(({ page, text }) => {
    const items: { id: string; document: string; page: number }[] = [];
    for (let start = 0, n = 0; start < text.length; start += 900, n++) {
      items.push({ id: `${resourceId}-${page}-${n}`, document: text.slice(start, start + 1100), page });
    }
    return items;
  });
  if (!chunks.length) return false;
  const target = await collection();
  for (let start = 0; start < chunks.length; start += 16) {
    const batch = chunks.slice(start, start + 16);
    await target.upsert({
      ids: batch.map((item) => item.id), documents: batch.map((item) => item.document),
      embeddings: await embed(batch.map((item) => item.document)),
      metadatas: batch.map((item) => ({ resourceId, offeringId, page: item.page, title })),
    });
  }
  return true;
}

export async function searchChroma(client: Client, prompt: string): Promise<Passage[] | null> {
  if (!configured()) return null;
  // Supabase remains the authority. Chroma's metadata filter is only an optimization.
  const allowed = await client.from("course_resources").select("id,offering_id,title");
  if (allowed.error) throw new Error("Could not authorize course resources");
  if (!allowed.data?.length) return [];
  const offerings = [...new Set(allowed.data.map((item) => item.offering_id))];
  const target = await collection();
  const [vector] = await embed([prompt]);
  const result = await target.query({ queryEmbeddings: [vector], nResults: 8,
    where: { offeringId: { $in: offerings } }, include: ["documents", "metadatas"] });
  const access = new Map(allowed.data.map((item) => [item.id, item]));
  const output: Passage[] = [];
  for (let i = 0; i < (result.ids[0]?.length ?? 0); i++) {
    const meta = result.metadatas?.[0]?.[i];
    const document = result.documents?.[0]?.[i];
    const owner = access.get(String(meta?.resourceId ?? ""));
    if (!owner || owner.offering_id !== meta?.offeringId || typeof document !== "string") continue;
    output.push({ title: owner.title, page: Number(meta?.page) || 1, excerpt: document.slice(0, 1100) });
    if (output.length === 3) break;
  }
  return output;
}
