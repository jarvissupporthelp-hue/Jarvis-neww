import type { GameDifficulty } from '../game-types.ts';

interface MatrixChallenge {
  title: string;
  description: string;
  targetMatrix: [number, number, number, number]; // [a, b, c, d] -> [[a, b], [c, d]]
}

const CHALLENGES_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', MatrixChallenge[]> = {
  Standard: [
    {
      title: '90° Counter-Clockwise Rotation',
      description: 'Map basis vector î=(1,0) to (0,1) and ĵ=(0,1) to (-1,0).',
      targetMatrix: [0, -1, 1, 0],
    },
    {
      title: 'Anisotropic Scaling',
      description: 'Stretch X by factor 2 and reflect across the X-axis (Y negated).',
      targetMatrix: [2, 0, 0, -1],
    },
    {
      title: 'Horizontal Shear',
      description: 'Keep Y unchanged while shearing X by +1·Y.',
      targetMatrix: [1, 1, 0, 1],
    },
  ],
  Honors: [
    {
      title: 'Diagonal Reflection + Scale',
      description: 'Swap X and Y axes and scale the result by 2 (determinant = -4).',
      targetMatrix: [0, 2, 2, 0],
    },
    {
      title: 'Combined Shear & Inversion',
      description: 'Map î to (1, -1) and ĵ to (1, 1).',
      targetMatrix: [1, 1, -1, 1],
    },
    {
      title: '180° Inversion + Vertical Stretch',
      description: 'Negate X, negate Y, and double Y magnitude.',
      targetMatrix: [-1, 0, 0, -2],
    },
  ],
  Olympiad: [
    {
      title: 'Area-Tripling Shear Transform',
      description: 'Map î=(1,0) to (2, 1) and ĵ=(0,1) to (1, 2) (det = 3).',
      targetMatrix: [2, 1, 1, 2],
    },
    {
      title: 'Skew-Symmetric Scale',
      description: 'Map î=(1,0) to (-1, 2) and ĵ=(0,1) to (-2, -1).',
      targetMatrix: [-1, -2, 2, -1],
    },
    {
      title: 'Rank-1 Projection Collapse',
      description: 'Collapse 2D unit square onto the line y = x via [[1,1],[1,1]].',
      targetMatrix: [1, 1, 1, 1],
    },
  ],
};

// Unit square vertices (slightly asymmetric flag shape so orientation is unambiguous)
export const BASE_SHAPE: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0.35, 1],
  [0, 0.65],
];

export function transformPoint(
  [x, y]: [number, number],
  [a, b, c, d]: [number, number, number, number]
): [number, number] {
  return [a * x + b * y, c * x + d * y];
}

export function getMatrixChallenges(difficulty: GameDifficulty): MatrixChallenge[] {
  if (difficulty === 'Beginner') return CHALLENGES_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return CHALLENGES_BY_TIER.Standard;
  if (difficulty === 'Advanced') return CHALLENGES_BY_TIER.Honors;
  return CHALLENGES_BY_TIER.Olympiad;
}
