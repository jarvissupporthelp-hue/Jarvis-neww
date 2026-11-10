export type CoursePdfSearchResult = {
  matches: { title: string; page: number; excerpt: string }[];
  unavailable: number;
};

export function formatCoursePdfSearch(results: CoursePdfSearchResult) {
  const sections = [results.matches.length
    ? "Quoted passages from your course PDFs."
    : "No matching passages in your searchable course PDFs."];
  for (const { title, page, excerpt } of results.matches) {
    const quote = excerpt.replaceAll("[[[", "").replaceAll("]]]", "");
    sections.push(`${title} · Page ${page}\n“${quote}”`);
  }
  if (results.unavailable) {
    sections.push(`JARVIS couldn’t search ${results.unavailable} course PDF(s) that haven’t been indexed. You can still open them in Course resources.`);
  }
  return sections.join("\n\n");
}
