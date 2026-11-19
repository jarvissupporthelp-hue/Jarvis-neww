import type { GameDifficulty } from '../game-types.ts';

interface SortPuzzle {
  title: string;
  initial: number[];
}

const PUZZLES_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', SortPuzzle[]> = {
  Standard: [
    { title: 'Round 1 · 5-Element Array', initial: [42, 18, 65, 29, 11] },
    { title: 'Round 2 · Nearly Sorted Array', initial: [14, 52, 27, 38, 64, 45] },
    { title: 'Round 3 · Reverse Pair Array', initial: [71, 33, 58, 19, 44, 26] },
  ],
  Honors: [
    { title: 'Round 1 · 7-Element Permutation', initial: [64, 22, 85, 12, 47, 39, 73] },
    { title: 'Round 2 · Interleaved Peaks', initial: [91, 15, 68, 29, 82, 41, 55] },
    { title: 'Round 3 · Cyclic Shift Recovery', initial: [40, 55, 70, 85, 10, 25, 32] },
  ],
  Olympiad: [
    { title: 'Round 1 · 8-Element Cycle Sort', initial: [88, 19, 63, 41, 77, 12, 54, 30] },
    { title: 'Round 2 · Inverted Sequence', initial: [94, 78, 61, 49, 36, 24, 15, 8] },
    { title: 'Round 3 · Dense Disordered Set', initial: [51, 93, 27, 68, 14, 82, 39, 75] },
  ],
};

export function isSortedAsc(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

function minimumSwaps(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const destination = new Map(sorted.map((value, index) => [value, index]));
  const visited = new Set<number>();
  let cycles = 0;
  for (let index = 0; index < values.length; index++) {
    if (visited.has(index)) continue;
    cycles++;
    let position = index;
    while (!visited.has(position)) {
      visited.add(position);
      position = destination.get(values[position])!;
    }
  }
  return values.length - cycles;
}

export function getSortPuzzles(difficulty: GameDifficulty) {
  const puzzles = difficulty === 'Beginner' ? PUZZLES_BY_TIER.Standard.slice(0, 2)
    : difficulty === 'Intermediate' ? PUZZLES_BY_TIER.Standard
    : difficulty === 'Advanced' ? PUZZLES_BY_TIER.Honors : PUZZLES_BY_TIER.Olympiad;
  return puzzles.map((puzzle) => ({ ...puzzle, parSwaps: minimumSwaps(puzzle.initial) }));
}
