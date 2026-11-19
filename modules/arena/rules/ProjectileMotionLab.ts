import type { GameDifficulty } from '../game-types.ts';

interface LandingChallenge {
  name: string;
  gravity: number; // m/s^2
  planetLabel: string;
  targetX: number; // meters
  tolerance: number; // meters (+/-)
  windAccel: number; // m/s^2 horizontal
}

const ZONES_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', LandingChallenge[]> = {
  Standard: [
    {
      name: 'Range Calibration · Earth',
      gravity: 9.81,
      planetLabel: 'Earth (g = 9.81 m/s²)',
      targetX: 65,
      tolerance: 5,
      windAccel: 0,
    },
    {
      name: 'Mid-Range Arc · Earth',
      gravity: 9.81,
      planetLabel: 'Earth (g = 9.81 m/s²)',
      targetX: 92,
      tolerance: 4.5,
      windAccel: 0,
    },
    {
      name: 'Lunar Trajectory Test',
      gravity: 1.62,
      planetLabel: 'Moon (g = 1.62 m/s²)',
      targetX: 110,
      tolerance: 5,
      windAccel: 0,
    },
  ],
  Honors: [
    {
      name: 'Martian Atmosphere Drop',
      gravity: 3.72,
      planetLabel: 'Mars (g = 3.72 m/s²)',
      targetX: 88,
      tolerance: 4,
      windAccel: -0.6,
    },
    {
      name: 'Headwind Correction · Earth',
      gravity: 9.81,
      planetLabel: 'Earth (g = 9.81 m/s²)',
      targetX: 74,
      tolerance: 3.5,
      windAccel: -1.4,
    },
    {
      name: 'Throw with a Tailwind · Mars',
      gravity: 3.72,
      planetLabel: 'Mars (g = 3.72 m/s²)',
      targetX: 118,
      tolerance: 4,
      windAccel: 0.9,
    },
  ],
  Olympiad: [
    {
      name: 'Precision Headwind · Earth',
      gravity: 9.81,
      planetLabel: 'Earth (g = 9.81 m/s²)',
      targetX: 104,
      tolerance: 2.8,
      windAccel: -1.8,
    },
    {
      name: 'Jovian High-G Arc',
      gravity: 16.5,
      planetLabel: 'High-G Exoplanet (g = 16.5 m/s²)',
      targetX: 68,
      tolerance: 2.5,
      windAccel: 1.2,
    },
    {
      name: 'Crosswind Precision · Mars',
      gravity: 3.72,
      planetLabel: 'Mars (g = 3.72 m/s²)',
      targetX: 125,
      tolerance: 2.5,
      windAccel: -1.1,
    },
  ],
};

export function computeTrajectory(
  angleDeg: number,
  velocity: number,
  gravity: number,
  windAccel: number
) {
  const rad = (angleDeg * Math.PI) / 180;
  const vx0 = velocity * Math.cos(rad);
  const vy0 = velocity * Math.sin(rad);
  const flightTime = (2 * vy0) / gravity;
  const maxHeight = (vy0 * vy0) / (2 * gravity);
  const points: Array<{ x: number; y: number }> = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = (flightTime * i) / steps;
    const x = vx0 * t + 0.5 * windAccel * t * t;
    const y = vy0 * t - 0.5 * gravity * t * t;
    points.push({ x: Math.max(0, x), y: Math.max(0, y) });
  }
  const landingX = vx0 * flightTime + 0.5 * windAccel * flightTime * flightTime;
  return { points, landingX, flightTime, maxHeight };
}

export function getLandingChallenges(difficulty: GameDifficulty): LandingChallenge[] {
  if (difficulty === 'Beginner') return ZONES_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return ZONES_BY_TIER.Standard;
  if (difficulty === 'Advanced') return ZONES_BY_TIER.Honors;
  return ZONES_BY_TIER.Olympiad;
}
