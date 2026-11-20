import { ufarProfessors } from "./ufar-professors.ts";

const years: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
const assignment = /^(?:what (?:subjects? |courses? )?does|which (?:subjects?|courses?) does) (.+?) teach(?: (?:in|for|to) (?:the )?(?:year ([1-4])|(first|second|third|fourth|[1-4](?:st|nd|rd|th))[- ]year(?: students)?))?$/i;

export function directoryAnswer(prompt: string): string | null {
  const question = prompt.trim().replace(/[?.!]+$/, "").replace(/\s+/g, " ");
  if (/^who is (?:the )?(?:ima dean|dean of (?:the )?ima)$/i.test(question)) {
    const dean = ufarProfessors.find(person => person.role.startsWith("Dean of"));
    return dean ? `${dean.name}, ${dean.degree}, is the ${dean.role}.` : null;
  }
  const match = assignment.exec(question);
  if (!match) return null;
  const person = ufarProfessors.find(entry => entry.name.toLowerCase() === match[1].toLowerCase());
  if (!person) return null;
  const yearText = (match[2] || match[3] || "").toLowerCase();
  const year = years[yearText] || Number.parseInt(yearText, 10);
  const rows = person.courses.filter(row => !year || row.year === year);
  if (!rows.length) return `The IMA directory has no confirmed teaching assignment for ${person.name}${year ? " in Year " + year : ""}.`;
  return person.name + " teaches the following IMA courses:\n" + rows.map(row => `Year ${row.year}: ${row.subjects.join(", ")}.`).join("\n");
}
