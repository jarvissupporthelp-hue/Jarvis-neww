import type { GameDifficulty } from '../game-types.ts';

export type QuadratureMethod = 'Left' | 'Right' | 'Midpoint' | 'Trapezoid';

interface IntegralProblem {
  title: string;
  formulaLabel: string;
  fn: (x: number) => number;
  a: number;
  b: number;
  exactArea: number;
  tolerance: number;
  maxPartitionsAllowed: number;
}

const PROBLEMS_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', IntegralProblem[]> = {
  Standard: [
    {
      title: 'Parabolic Area · f(x) = x²',
      formulaLabel: '∫₀³ x² dx = 9.00',
      fn: (x) => x * x,
      a: 0,
      b: 3,
      exactArea: 9,
      tolerance: 0.4,
      maxPartitionsAllowed: 10,
    },
    {
      title: 'Linear Ramp · f(x) = 2x + 1',
      formulaLabel: '∫₀⁴ (2x + 1) dx = 20.00',
      fn: (x) => 2 * x + 1,
      a: 0,
      b: 4,
      exactArea: 20,
      tolerance: 0.25,
      maxPartitionsAllowed: 8,
    },
    {
      title: 'Inverted Arch · f(x) = 4 - x²',
      formulaLabel: '∫₀² (4 - x²) dx = 5.33',
      fn: (x) => 4 - x * x,
      a: 0,
      b: 2,
      exactArea: 16 / 3,
      tolerance: 0.3,
      maxPartitionsAllowed: 10,
    },
  ],
  Honors: [
    {
      title: 'Cubic Growth · f(x) = 0.5x³',
      formulaLabel: '∫₀² 0.5x³ dx = 2.00',
      fn: (x) => 0.5 * x * x * x,
      a: 0,
      b: 2,
      exactArea: 2,
      tolerance: 0.12,
      maxPartitionsAllowed: 6,
    },
    {
      title: 'Symmetric Bell · f(x) = 6 - 0.5x²',
      formulaLabel: '∫₋₂² (6 - 0.5x²) dx = 21.33',
      fn: (x) => 6 - 0.5 * x * x,
      a: -2,
      b: 2,
      exactArea: 64 / 3,
      tolerance: 0.25,
      maxPartitionsAllowed: 6,
    },
    {
      title: 'Exponential Rise · f(x) = e^(0.5x)',
      formulaLabel: '∫₀² e^(0.5x) dx ≈ 3.4366',
      fn: (x) => Math.exp(0.5 * x),
      a: 0,
      b: 2,
      exactArea: 2 * (Math.E - 1),
      tolerance: 0.08,
      maxPartitionsAllowed: 6,
    },
  ],
  Olympiad: [
    {
      title: 'High-Curvature Cubic · f(x) = x³ - x + 2',
      formulaLabel: '∫₀² (x³ - x + 2) dx = 6.00',
      fn: (x) => x * x * x - x + 2,
      a: 0,
      b: 2,
      exactArea: 6,
      tolerance: 0.13,
      maxPartitionsAllowed: 4,
    },
    {
      title: 'Trigonometric Arch · f(x) = 4·sin(x)',
      formulaLabel: '∫₀^π 4·sin(x) dx = 8.00',
      fn: (x) => 4 * Math.sin(x),
      a: 0,
      b: Math.PI,
      exactArea: 8,
      tolerance: 0.15,
      maxPartitionsAllowed: 5,
    },
    {
      title: 'Gaussian Slice · f(x) = 5·e^(-0.4x²)',
      formulaLabel: '∫₀² 5·e^(-0.4x²) dx ≈ 6.4903',
      fn: (x) => 5 * Math.exp(-0.4 * x * x),
      a: 0,
      b: 2,
      exactArea: 6.4903116989786165,
      tolerance: 0.05,
      maxPartitionsAllowed: 6,
    },
  ],
};

export function getIntegralProblems(difficulty: GameDifficulty): IntegralProblem[] {
  if (difficulty === 'Beginner') return PROBLEMS_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return PROBLEMS_BY_TIER.Standard;
  if (difficulty === 'Advanced') return PROBLEMS_BY_TIER.Honors;
  return PROBLEMS_BY_TIER.Olympiad;
}

export function estimateIntegral(prob: IntegralProblem, partitions: number, method: QuadratureMethod) {
  const dx = (prob.b - prob.a) / partitions;
  let sum = 0;
  const computedRects: Array<{ x0: number; x1: number; hLeft: number; hRight: number; hSample: number }> = [];
  let peak = 1;

  for (let s = 0; s <= 40; s++) {
    const xs = prob.a + ((prob.b - prob.a) * s) / 40;
    peak = Math.max(peak, prob.fn(xs) * 1.15);
  }

  for (let i = 0; i < partitions; i++) {
    const x0 = prob.a + i * dx;
    const x1 = x0 + dx;
    const yL = prob.fn(x0);
    const yR = prob.fn(x1);
    const yM = prob.fn((x0 + x1) / 2);

    let h = yL;
    if (method === 'Right') h = yR;
    if (method === 'Midpoint') h = yM;
    if (method === 'Trapezoid') h = (yL + yR) / 2;

    sum += h * dx;
    computedRects.push({ x0, x1, hLeft: yL, hRight: yR, hSample: h });
  }
  return { estimate: sum, rects: computedRects, yMax: peak };
}
