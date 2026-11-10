import type { createStudyClient } from "./study-context";

const maxPages = 60;
const maxPageCharacters = 8_000;

export async function extractCoursePages(bytes: Uint8Array) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes, { stopAtErrors: true });
  try {
    if (pdf.numPages > maxPages) return [];
    const { text } = await extractText(pdf, { mergePages: false });
    return text.flatMap((content, index) => {
      const cleaned = content.replace(/\u0000/g, "").trim().slice(0, maxPageCharacters);
      return cleaned ? [{ page: index + 1, text: cleaned }] : [];
    });
  } finally {
    await pdf.loadingTask.destroy();
  }
}

export async function indexCoursePdf(
  client: NonNullable<ReturnType<typeof createStudyClient>>, id: string, bytes: Uint8Array,
) {
  const pages = await extractCoursePages(bytes).catch(() => []);
  const { data, error } = await client.rpc("save_course_pdf_index", { p_id: id, p_pages: pages });
  return error ? null : data as "indexed" | "unsearchable";
}
