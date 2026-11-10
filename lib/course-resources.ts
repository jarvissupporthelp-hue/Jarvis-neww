export const maxPdfBytes = 4 * 1024 * 1024;

export type CourseResource = {
  id: string;
  offering_id: string;
  title: string;
  filename: string;
  size_bytes: number;
  index_status: "pending" | "indexed" | "unsearchable";
};

export function hasPdfMarkers(bytes: Uint8Array) {
  const decoder = new TextDecoder();
  return /^%PDF-[12]\.\d[\r\n]/.test(decoder.decode(bytes.subarray(0, 16)))
    && /%%EOF[\t\r\n ]*$/.test(decoder.decode(bytes.subarray(-1024)));
}
