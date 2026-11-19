import type { GameDifficulty } from '../game-types.ts';

interface MarketScenario {
  title: string;
  shockDescription: string;
  // Demand: P = dIntercept - dSlope * Q
  dIntercept: number;
  dSlope: number;
  // Supply: P = sIntercept + sSlope * Q
  sIntercept: number;
  sSlope: number;
}

const SCENARIOS_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', MarketScenario[]> = {
  Standard: [
    {
      title: 'Semiconductor Baseline',
      shockDescription: 'Demand: P = 100 - 2Q · Supply: P = 20 + 2Q. Set price P to clear the market.',
      dIntercept: 100,
      dSlope: 2,
      sIntercept: 20,
      sSlope: 2,
    },
    {
      title: 'Battery Input Subsidy',
      shockDescription: 'Supply shifts down: P = 10 + Q. Demand stays P = 70 - 2Q.',
      dIntercept: 70,
      dSlope: 2,
      sIntercept: 10,
      sSlope: 1,
    },
    {
      title: 'Campus Demand Surge',
      shockDescription: 'Demand shifts right: P = 110 - 3Q. Supply: P = 10 + 2Q.',
      dIntercept: 110,
      dSlope: 3,
      sIntercept: 10,
      sSlope: 2,
    },
  ],
  Honors: [
    {
      title: 'Carbon Credit Tariff',
      shockDescription: 'Marginal cost rises: Supply P = 15 + 3Q, Demand P = 95 - 2Q.',
      dIntercept: 95,
      dSlope: 2,
      sIntercept: 15,
      sSlope: 3,
    },
    {
      title: 'Inelastic Demand Shock',
      shockDescription: 'Demand P = 120 - 4Q, Supply P = 20 + 1Q. Locate equilibrium P*.',
      dIntercept: 120,
      dSlope: 4,
      sIntercept: 20,
      sSlope: 1,
    },
    {
      title: 'Renewable Grid Expansion',
      shockDescription: 'Demand P = 90 - 1.5Q, Supply P = 18 + 1.5Q.',
      dIntercept: 90,
      dSlope: 1.5,
      sIntercept: 18,
      sSlope: 1.5,
    },
  ],
  Olympiad: [
    {
      title: 'Asymmetric Elasticity Equilibrium',
      shockDescription: 'Demand P = 112 - 2.5Q, Supply P = 16 + 1.5Q.',
      dIntercept: 112,
      dSlope: 2.5,
      sIntercept: 16,
      sSlope: 1.5,
    },
    {
      title: 'Supply Bottleneck Shock',
      shockDescription: 'Demand P = 108 - 1.5Q, Supply P = 30 + 2.5Q.',
      dIntercept: 108,
      dSlope: 1.5,
      sIntercept: 30,
      sSlope: 2.5,
    },
    {
      title: 'High-Slope Clearing',
      shockDescription: 'Demand P = 130 - 3.5Q, Supply P = 10 + 2.5Q.',
      dIntercept: 130,
      dSlope: 3.5,
      sIntercept: 10,
      sSlope: 2.5,
    },
  ],
};

export function getMarketScenarios(difficulty: GameDifficulty): MarketScenario[] {
  if (difficulty === 'Beginner') return SCENARIOS_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return SCENARIOS_BY_TIER.Standard;
  if (difficulty === 'Advanced') return SCENARIOS_BY_TIER.Honors;
  return SCENARIOS_BY_TIER.Olympiad;
}

export function marketEquilibrium(scenario: MarketScenario) {
  const eqQ = (scenario.dIntercept - scenario.sIntercept) / (scenario.dSlope + scenario.sSlope);
  return { eqQ, eqP: scenario.sIntercept + scenario.sSlope * eqQ };
}
