import sections from "../data/ufar/reference.json" with { type: "json" };

const stop = new Set("what how who when where which can do does did is are my me i a an of on in and the to for if at with be by it about ufar university please tell student students have has you your from that this like color colour would could should explain".split(" "));
const synonyms: Record<string, string> = {
  late: "lateness", tard: "lateness", retard: "lateness", опоздание: "lateness", ուշացում: "lateness",
  exams: "exam", examen: "exam", examens: "exam", քննություն: "exam", экзамен: "exam",
  fees: "tuition", frais: "tuition", վարձ: "tuition", стоимость: "tuition",
  absences: "absence", բացակայություն: "absence", пропуск: "absence",
  scholarships: "scholarship", bourse: "scholarship", կրթաթոշակ: "scholarship", стипендия: "scholarship",
  campuses: "campus", address: "campus", adresse: "campus", հասցե: "campus", адрес: "campus",
};
function tokens(text: string) {
  return (text.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter(word => word.length > 1 && !stop.has(word)).map(word => synonyms[word] ?? word);
}

const chunks = sections.flatMap(section => {
  const blocks: string[] = [];
  let block = "";
  for (const paragraph of section.body.split(/\n\s*\n/)) {
    if (block && block.length + paragraph.length > 950) { blocks.push(block); block = ""; }
    block += (block ? "\n\n" : "") + paragraph;
  }
  if (block) blocks.push(block);
  return blocks.map(body => ({
    section: section.id, title: section.title, body,
    heading: new Set(tokens(section.title)), words: new Set(tokens(body)),
  }));
});
const frequency = new Map<string, number>();
for (const chunk of chunks) {
  for (const word of new Set([...chunk.heading, ...chunk.words])) frequency.set(word, (frequency.get(word) ?? 0) + 1);
}

export function findUfarReferences(question: string) {
  const terms = [...new Set(tokens(question))];
  return chunks.map(chunk => {
    let score = 0;
    for (const term of terms) {
      const weight = Math.log(1 + chunks.length / (frequency.get(term) ?? 1));
      score += weight * (Number(chunk.words.has(term)) + 0.55 * Number(chunk.heading.has(term)));
    }
    return { chunk, score };
  }).filter(hit => hit.score >= 3).sort((a, b) => b.score - a.score).slice(0, 4)
    .map(({ chunk }) => ({ title: chunk.title, section: chunk.section, excerpt: chunk.body.slice(0, 2400),
      url: `/ufar-reference#section-${chunk.section}` }));
}
