import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { books } from "@/modules/campus/books";

export const maxDuration = 120;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = books.find(([key]) => String(key) === id);
  if (!book) return new Response("Book not found", { status: 404 });
  const [, title, author] = book;
  try {
    const source = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(105000),
    });
    if (!source.ok) throw new Error("Source unavailable");
    const pdf = await PDFDocument.create();
    pdf.setTitle(title);
    pdf.setAuthor(author);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const supported = new Set(font.getCharacterSet());
    const safe = (value: string) => [...value].map((letter) => supported.has(letter.codePointAt(0)!) ? letter : "?").join("");
    const text = (await source.text()).replaceAll("\r", "").replaceAll("\uFEFF", "").replaceAll("\t", "    ");
    const cover = pdf.addPage([595, 842]);
    cover.drawText(safe(title), { x: 48, y: 690, size: 26, font, maxWidth: 499 });
    cover.drawText(safe(author), { x: 48, y: 620, size: 17, font });
    cover.drawText(`Source: https://www.gutenberg.org/ebooks/${id}`, { x: 48, y: 570, size: 11, font });
    let page = pdf.addPage([595, 842]);
    let y = 790;
    const width = 499;
    function line(value: string) {
      if (y < 55) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      page.drawText(value, { x: 48, y, size: 11, font, color: rgb(0.12, 0.14, 0.16) });
      y -= 14;
    }
    for (const row of text.split("\n")) {
      let current = "";
      for (const word of safe(row).split(" ")) {
        const next = current ? `${current} ${word}` : word;
        if (current && font.widthOfTextAtSize(next, 11) > width) {
          line(current);
          current = word;
        } else current = next;
      }
      line(current);
    }
    return new Response(new Uint8Array(await pdf.save()), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="jarvis-book-${id}.pdf"`,
      "Cache-Control": "public, max-age=86400",
    } });
  } catch {
    return new Response(`PDF unavailable. Read the book at https://www.gutenberg.org/ebooks/${id}.`, { status: 502 });
  }
}
