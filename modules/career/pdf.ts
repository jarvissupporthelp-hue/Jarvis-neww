import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { cvFields, type Cv } from "./rules.ts";

const fontFiles = [
  "noto-sans/files/noto-sans-latin-400-normal.woff",
  "noto-sans/files/noto-sans-cyrillic-400-normal.woff",
  "noto-sans-armenian/files/noto-sans-armenian-armenian-400-normal.woff",
];

export async function buildCvPdf(cv: Cv) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = await Promise.all(fontFiles.map(async (path) => pdf.embedFont(
    await readFile(join(process.cwd(), "node_modules", "@fontsource", path)), { subset: true },
  )));
  const glyphs = fonts.map((font) => new Set(font.getCharacterSet()));
  let page = pdf.addPage([595, 842]);
  let y = 785;
  function write(line: string, size: number) {
    let x = 48;
    if (y < 48) { page = pdf.addPage([595, 842]); y = 785; }
    let runs: { font: PDFFont; text: string }[] = [];
    function flush() {
      for (const run of runs) {
        page.drawText(run.text, { x, y, size, font: run.font, color: rgb(0.12, 0.2, 0.16) });
        x += run.font.widthOfTextAtSize(run.text, size);
      }
      runs = [];
    }
    let width = 0;
    for (const character of line.normalize("NFC")) {
      const index = glyphs.findIndex((set) => set.has(character.codePointAt(0)!));
      const font = fonts[Math.max(index, 0)];
      const text = index < 0 ? "?" : character;
      const advance = font.widthOfTextAtSize(text, size);
      if (width + advance > 499) {
        flush();
        y -= size + 5;
        if (y < 48) { page = pdf.addPage([595, 842]); y = 785; }
        x = 48;
        width = 0;
      }
      const last = runs.at(-1);
      if (last?.font === font) last.text += text;
      else runs.push({ font, text });
      width += advance;
    }
    flush();
    y -= size + 5;
  }
  pdf.setTitle("Curriculum Vitae");
  write("Curriculum Vitae", 26);
  for (const field of cvFields) {
    if (!cv[field].trim()) continue;
    y -= 12;
    write(field[0].toUpperCase() + field.slice(1), 15);
    for (const line of cv[field].replaceAll("\r", "").replaceAll("\t", "  ").split("\n")) write(line, 11);
  }
  return pdf.save();
}
