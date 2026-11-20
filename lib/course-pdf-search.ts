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

const searchNoise = new Set("please explain from my lecture pdf course notes using the a an and of in me show about what is how give example explique mon mes cours dans le la les des du de из мой мне про это конспект իմ մասին դասախոսությունից".split(" "));

export function courseSearchTerms(prompt: string) {
  const words = prompt.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter(word => word.length > 1 && !searchNoise.has(word)))].slice(0, 32);
}
