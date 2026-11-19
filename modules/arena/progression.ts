const leagueFloors = [
  ["Iron", 0], ["Bronze", 500], ["Silver", 1500], ["Gold", 3000],
  ["Platinum", 6000], ["Diamond", 10000], ["Legend", 20000],
] as const;

export function arenaProgress(totalXp: number) {
  const level = Math.floor((1 + Math.sqrt(1 + 4 * totalXp / 50)) / 2);
  const league = leagueFloors.findLast(([, floor]) => totalXp >= floor)?.[0] ?? "Iron";
  return { league, level };
}
