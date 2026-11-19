import type { GameDifficulty } from '../game-types.ts';

interface ElementTarget {
  symbol: string;
  name: string;
  protons: number;
  neutrons: number;
  electrons: number;
  chargeLabel: string;
  clue: string;
}

const TARGETS_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', ElementTarget[]> = {
  Standard: [
    {
      symbol: '¹²C',
      name: 'Neutral Carbon-12',
      protons: 6,
      neutrons: 6,
      electrons: 6,
      chargeLabel: '0 (Neutral)',
      clue: 'Atomic number 6, mass number 12, neutral net charge.',
    },
    {
      symbol: '¹⁶O',
      name: 'Neutral Oxygen-16',
      protons: 8,
      neutrons: 8,
      electrons: 8,
      chargeLabel: '0 (Neutral)',
      clue: 'Atomic number 8, mass number 16, 6 valence electrons.',
    },
    {
      symbol: '¹⁴N',
      name: 'Neutral Nitrogen-14',
      protons: 7,
      neutrons: 7,
      electrons: 7,
      chargeLabel: '0 (Neutral)',
      clue: 'Atomic number 7, mass number 14, 5 valence electrons.',
    },
  ],
  Honors: [
    {
      symbol: '²³Na⁺',
      name: 'Sodium Cation (Na⁺)',
      protons: 11,
      neutrons: 12,
      electrons: 10,
      chargeLabel: '+1 Cation',
      clue: 'Atomic number 11, mass number 23, net charge +1 (noble gas core).',
    },
    {
      symbol: '¹⁹F⁻',
      name: 'Fluoride Anion (F⁻)',
      protons: 9,
      neutrons: 10,
      electrons: 10,
      chargeLabel: '-1 Anion',
      clue: 'Atomic number 9, mass number 19, net charge -1 (full L shell).',
    },
    {
      symbol: '²⁴Mg²⁺',
      name: 'Magnesium Dication (Mg²⁺)',
      protons: 12,
      neutrons: 12,
      electrons: 10,
      chargeLabel: '+2 Cation',
      clue: 'Atomic number 12, mass number 24, net charge +2.',
    },
  ],
  Olympiad: [
    {
      symbol: '³⁵Cl⁻',
      name: 'Chloride-35 Anion',
      protons: 17,
      neutrons: 18,
      electrons: 18,
      chargeLabel: '-1 Anion',
      clue: 'Atomic number 17, mass number 35, octet-complete 3rd shell.',
    },
    {
      symbol: '³¹P³⁻',
      name: 'Phosphide-31 Anion',
      protons: 15,
      neutrons: 16,
      electrons: 18,
      chargeLabel: '-3 Anion',
      clue: 'Atomic number 15, mass number 31, net charge -3.',
    },
    {
      symbol: '²⁷Al³⁺',
      name: 'Aluminum-27 Cation',
      protons: 13,
      neutrons: 14,
      electrons: 10,
      chargeLabel: '+3 Cation',
      clue: 'Atomic number 13, mass number 27, net charge +3.',
    },
  ],
};

export function getElementTargets(difficulty: GameDifficulty): ElementTarget[] {
  if (difficulty === 'Beginner') return TARGETS_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return TARGETS_BY_TIER.Standard;
  if (difficulty === 'Advanced') return TARGETS_BY_TIER.Honors;
  return TARGETS_BY_TIER.Olympiad;
}
