export const arenaDisciplines = ["computing", "mathematics", "physics", "chemistry", "economics"] as const;

export const arenaGames = [
  { id: "logic-circuit-lab", discipline: "computing", minutes: 4 },
  { id: "matrix-transform-arena", discipline: "mathematics", minutes: 5 },
  { id: "algorithm-sort-duel", discipline: "computing", minutes: 4 },
  { id: "binary-hex-bridge", discipline: "computing", minutes: 3 },
  { id: "orbital-ballistics-sim", discipline: "physics", minutes: 4 },
  { id: "stoichiometry-balancer", discipline: "chemistry", minutes: 4 },
  { id: "equilibrium-market-sim", discipline: "economics", minutes: 4 },
  { id: "cipher-breaker-lab", discipline: "computing", minutes: 5 },
  { id: "calculus-integral-estimator", discipline: "mathematics", minutes: 4 },
  { id: "periodic-element-forge", discipline: "chemistry", minutes: 4 },
] as const;

export type ArenaGameId = (typeof arenaGames)[number]["id"];
type Discipline = (typeof arenaDisciplines)[number];

export function arenaSubject(value: string | string[] | undefined) {
  return arenaDisciplines.find((discipline) => discipline === value);
}

export function arenaHref(locale: "hy" | "en", subject?: Discipline, game?: ArenaGameId) {
  const query = new URLSearchParams();
  if (locale === "en") query.set("lang", locale);
  if (subject) query.set("subject", subject);
  const path = game ? `/arena/${game}` : "/arena";
  return query.size ? `${path}?${query}` : path;
}
