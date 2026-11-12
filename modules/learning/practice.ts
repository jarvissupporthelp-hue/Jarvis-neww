const intervals = [1, 2, 4, 8, 16];

export function reviewFlashcard(box: number, correct: boolean, now: number) {
  const next = correct ? Math.min(5, box + 1) : 1;
  return { box: next, due: now + intervals[next - 1] * 86_400_000 };
}
