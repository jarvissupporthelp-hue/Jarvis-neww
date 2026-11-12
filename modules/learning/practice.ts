const intervals = [1, 2, 4, 8, 16];

export function reviewFlashcard(box: number, correct: boolean, now: number) {
  const next = correct ? Math.min(5, box + 1) : 1;
  return { box: next, due: now + intervals[next - 1] * 86_400_000 };
}

export type MindNode = { id: string; label: string; color: string; x: number; y: number };
export type MindMap = { nodes: MindNode[]; links: [string, string][] };

export function exportMindMap(map: MindMap) {
  return JSON.stringify(map, null, 2);
}

export function importMindMap(json: string): MindMap {
  const value = JSON.parse(json);
  if (!Array.isArray(value?.nodes) || !Array.isArray(value?.links) || value.nodes.length > 200) throw new Error("Invalid mind map.");
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (!node || typeof node.id !== "string" || ids.has(node.id) || typeof node.label !== "string"
      || !/^#[a-f0-9]{6}$/i.test(node.color) || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error("Invalid node.");
    ids.add(node.id);
  }
  for (const link of value.links) {
    if (!Array.isArray(link) || link.length !== 2 || link[0] === link[1] || !link.every((id) => ids.has(id))) throw new Error("Invalid connection.");
  }
  return { nodes: value.nodes, links: value.links };
}
