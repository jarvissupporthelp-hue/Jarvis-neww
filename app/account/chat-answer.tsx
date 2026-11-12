import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-[#173326]">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[#e9f0e8] px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

export function ChatAnswer({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push(<div key={blocks.length} className="overflow-hidden rounded-xl border border-[#263b32] bg-[#172b23] text-[#eef8ee]">
        {language && <p className="border-b border-white/15 px-4 py-1.5 text-xs uppercase tracking-wide text-[#b8d3bd]">{language}</p>}
        <pre className="overflow-x-auto p-4 text-sm leading-6"><code>{code.join("\n")}</code></pre>
      </div>);
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      blocks.push(<h3 key={blocks.length} className="pt-1 text-base font-semibold text-[#173326]">{inline(line.replace(/^#{1,3}\s+/, ""))}</h3>);
      index++;
      continue;
    }

    const ordered = /^\d+[.)]\s+/.test(line);
    const unordered = /^[-*]\s+/.test(line);
    if (ordered || unordered) {
      const items: string[] = [];
      const marker = ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/;
      while (index < lines.length && marker.test(lines[index].trim())) items.push(lines[index++].trim().replace(marker, ""));
      const children = items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>);
      blocks.push(ordered
        ? <ol key={blocks.length} className="list-decimal space-y-1 pl-5 marker:font-semibold marker:text-[#477250]">{children}</ol>
        : <ul key={blocks.length} className="list-disc space-y-1 pl-5 marker:text-[#477250]">{children}</ul>);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(?:```|#{1,3}\s+|[-*]\s+|\d+[.)]\s+)/.test(lines[index].trim())) {
      paragraph.push(lines[index++].trim());
    }
    blocks.push(<p key={blocks.length} className="leading-7">{inline(paragraph.join(" "))}</p>);
  }

  return <div className="space-y-3 break-words text-[15px] text-[#293c30] sm:text-base">{blocks}</div>;
}
