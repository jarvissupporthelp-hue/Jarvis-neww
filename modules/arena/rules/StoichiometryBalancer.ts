import type { GameDifficulty } from '../game-types.ts';

interface MoleculeTerm {
  formula: string;
  atoms: Record<string, number>;
}

interface ChemicalEquation {
  title: string;
  reactants: MoleculeTerm[];
  products: MoleculeTerm[];
}

const EQUATIONS_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', ChemicalEquation[]> = {
  Standard: [
    {
      title: 'Water Synthesis',
      reactants: [
        { formula: 'H₂', atoms: { H: 2 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
      products: [{ formula: 'H₂O', atoms: { H: 2, O: 1 } }],
    },
    {
      title: 'Ammonia Haber Process',
      reactants: [
        { formula: 'N₂', atoms: { N: 2 } },
        { formula: 'H₂', atoms: { H: 2 } },
      ],
      products: [{ formula: 'NH₃', atoms: { N: 1, H: 3 } }],
    },
    {
      title: 'Methane Combustion',
      reactants: [
        { formula: 'CH₄', atoms: { C: 1, H: 4 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
      products: [
        { formula: 'CO₂', atoms: { C: 1, O: 2 } },
        { formula: 'H₂O', atoms: { H: 2, O: 1 } },
      ],
    },
  ],
  Honors: [
    {
      title: 'Iron(III) Oxide Formation',
      reactants: [
        { formula: 'Fe', atoms: { Fe: 1 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
      products: [{ formula: 'Fe₂O₃', atoms: { Fe: 2, O: 3 } }],
    },
    {
      title: 'Propane Combustion',
      reactants: [
        { formula: 'C₃H₈', atoms: { C: 3, H: 8 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
      products: [
        { formula: 'CO₂', atoms: { C: 1, O: 2 } },
        { formula: 'H₂O', atoms: { H: 2, O: 1 } },
      ],
    },
    {
      title: 'Thermite Reduction',
      reactants: [
        { formula: 'Fe₂O₃', atoms: { Fe: 2, O: 3 } },
        { formula: 'Al', atoms: { Al: 1 } },
      ],
      products: [
        { formula: 'Fe', atoms: { Fe: 1 } },
        { formula: 'Al₂O₃', atoms: { Al: 2, O: 3 } },
      ],
    },
  ],
  Olympiad: [
    {
      title: 'Ethane Complete Combustion',
      reactants: [
        { formula: 'C₂H₆', atoms: { C: 2, H: 6 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
      products: [
        { formula: 'CO₂', atoms: { C: 1, O: 2 } },
        { formula: 'H₂O', atoms: { H: 2, O: 1 } },
      ],
    },
    {
      title: 'Photosynthesis Reduction',
      reactants: [
        { formula: 'CO₂', atoms: { C: 1, O: 2 } },
        { formula: 'H₂O', atoms: { H: 2, O: 1 } },
      ],
      products: [
        { formula: 'C₆H₁₂O₆', atoms: { C: 6, H: 12, O: 6 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
    },
    {
      title: 'Ammonia Catalytic Oxidation',
      reactants: [
        { formula: 'NH₃', atoms: { N: 1, H: 3 } },
        { formula: 'O₂', atoms: { O: 2 } },
      ],
      products: [
        { formula: 'NO', atoms: { N: 1, O: 1 } },
        { formula: 'H₂O', atoms: { H: 2, O: 1 } },
      ],
    },
  ],
};

export function getEquations(difficulty: GameDifficulty): ChemicalEquation[] {
  if (difficulty === 'Beginner') return EQUATIONS_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return EQUATIONS_BY_TIER.Standard;
  if (difficulty === 'Advanced') return EQUATIONS_BY_TIER.Honors;
  return EQUATIONS_BY_TIER.Olympiad;
}

export function atomInventory(equation: ChemicalEquation, reactants: number[], products: number[]) {
  function totals(terms: MoleculeTerm[], coefficients: number[]) {
    const atoms: Record<string, number> = {};
    terms.forEach((term, index) => {
      Object.entries(term.atoms).forEach(([element, count]) => {
        atoms[element] = (atoms[element] ?? 0) + count * coefficients[index];
      });
    });
    return atoms;
  }

  const left = totals(equation.reactants, reactants);
  const right = totals(equation.products, products);
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].map((element) => ({
    element,
    left: left[element] ?? 0,
    right: right[element] ?? 0,
    balanced: (left[element] ?? 0) === (right[element] ?? 0),
  }));
}
