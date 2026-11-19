import type { GameDifficulty } from '../game-types.ts';

export type GateType = 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR';

interface CircuitChallenge {
  title: string;
  description: string;
  inputs: { A: number; B: number; C: number };
  targetOut: number;
  truthTestVectors: Array<{ A: number; B: number; C: number; expected: number }>;
  availableGates: GateType[];
  hint: string;
}

export function evalGate(type: GateType, x: number, y: number): number {
  switch (type) {
    case 'AND':
      return x & y;
    case 'OR':
      return x | y;
    case 'XOR':
      return x ^ y;
    case 'NAND':
      return (x & y) === 1 ? 0 : 1;
    case 'NOR':
      return (x | y) === 1 ? 0 : 1;
  }
}

const CHALLENGES_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', CircuitChallenge[]> = {
  Standard: [
    {
      title: 'Stage 1 · Half-Adder Carry & Sum',
      description: 'Configure Gate 1 (inputs A, B) and Gate 2 (inputs G1, C) so the circuit outputs 1 ONLY when A=1, B=0, and C=1.',
      inputs: { A: 1, B: 0, C: 1 },
      targetOut: 1,
      truthTestVectors: [
        { A: 1, B: 0, C: 1, expected: 1 },
        { A: 1, B: 1, C: 1, expected: 0 },
        { A: 0, B: 0, C: 1, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR'],
      hint: 'XOR outputs 1 when inputs differ; AND requires both inputs to be 1.',
    },
    {
      title: 'Stage 2 · Fault-Tolerant Sensor Gate',
      description: 'Output 1 if at least one of A or B is active (1), AND safety line C is active (1).',
      inputs: { A: 0, B: 1, C: 1 },
      targetOut: 1,
      truthTestVectors: [
        { A: 0, B: 1, C: 1, expected: 1 },
        { A: 1, B: 0, C: 1, expected: 1 },
        { A: 0, B: 0, C: 1, expected: 0 },
        { A: 1, B: 1, C: 0, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NAND'],
      hint: 'Use OR on sensors A and B, then combine with C using AND.',
    },
    {
      title: 'Stage 3 · Active-Low Interlock',
      description: 'Output 1 unless both A and B are 1 simultaneously while C is 1. Specifically, match the full test vector.',
      inputs: { A: 1, B: 1, C: 1 },
      targetOut: 0,
      truthTestVectors: [
        { A: 1, B: 1, C: 1, expected: 0 },
        { A: 1, B: 0, C: 1, expected: 1 },
        { A: 0, B: 1, C: 1, expected: 1 },
        { A: 0, B: 0, C: 0, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'NAND', 'XOR'],
      hint: 'NAND(A, B) blocks only when both A and B are 1; AND with C gates the output.',
    },
    {
      title: 'Stage 4 · 3-Input Odd Parity',
      description: 'Build an odd-parity detector: output 1 whenever an odd number of inputs (A, B, C) are 1.',
      inputs: { A: 1, B: 1, C: 1 },
      targetOut: 1,
      truthTestVectors: [
        { A: 1, B: 1, C: 1, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 0 },
        { A: 0, B: 1, C: 0, expected: 1 },
        { A: 0, B: 0, C: 0, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NOR'],
      hint: 'Chaining two XOR gates computes A ⊕ B ⊕ C.',
    },
  ],
  Honors: [
    {
      title: 'Stage 1 · Inhibited Signal Latch',
      description: 'Output 1 only when A and B are both 0, and C is 1.',
      inputs: { A: 0, B: 0, C: 1 },
      targetOut: 1,
      truthTestVectors: [
        { A: 0, B: 0, C: 1, expected: 1 },
        { A: 1, B: 0, C: 1, expected: 0 },
        { A: 0, B: 1, C: 1, expected: 0 },
        { A: 0, B: 0, C: 0, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'NOR', 'NAND', 'XOR'],
      hint: 'NOR(A, B) is 1 exclusively when A=0 and B=0.',
    },
    {
      title: 'Stage 2 · Majority-Disagreement',
      description: 'Output 1 when A=B (both 0 or both 1) is FALSE, and C is 0.',
      inputs: { A: 1, B: 0, C: 0 },
      targetOut: 1,
      truthTestVectors: [
        { A: 1, B: 0, C: 0, expected: 1 },
        { A: 0, B: 1, C: 0, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 0 },
        { A: 1, B: 0, C: 1, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NOR', 'NAND'],
      hint: 'Wait—check when Gate 2 should output 1 if C=0 and Gate1=1: try NOR or XOR.',
    },
    {
      title: 'Stage 3 · Universal NAND Synthesis',
      description: 'Using only NAND and OR, output 0 when A=1, B=1, C=1, and output 1 when A=0, B=1, C=0.',
      inputs: { A: 0, B: 1, C: 0 },
      targetOut: 1,
      truthTestVectors: [
        { A: 1, B: 1, C: 1, expected: 0 },
        { A: 0, B: 1, C: 0, expected: 1 },
        { A: 0, B: 0, C: 1, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 0 },
      ],
      availableGates: ['NAND', 'OR', 'AND'],
      hint: 'NAND(A,B) is 0 when A=1,B=1; OR with C=0 stays 0, wait test vectors!',
    },
    {
      title: 'Stage 4 · Bus Contention Guard',
      description: 'Output 1 when (A NOR B) and C differ (one is 1 and the other is 0).',
      inputs: { A: 0, B: 0, C: 0 },
      targetOut: 1,
      truthTestVectors: [
        { A: 0, B: 0, C: 0, expected: 1 },
        { A: 0, B: 0, C: 1, expected: 0 },
        { A: 1, B: 0, C: 1, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 0 },
      ],
      availableGates: ['NOR', 'XOR', 'AND', 'OR'],
      hint: 'Gate 1 = NOR(A,B), Gate 2 = XOR(G1, C).',
    },
  ],
  Olympiad: [
    {
      title: 'Stage 1 · Dual-Inversion Logic',
      description: 'Synthesize ~(A · B) ⊕ C across all 4 verification vectors.',
      inputs: { A: 1, B: 1, C: 1 },
      targetOut: 1,
      truthTestVectors: [
        { A: 1, B: 1, C: 1, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 0 },
        { A: 0, B: 1, C: 0, expected: 1 },
        { A: 1, B: 0, C: 1, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NAND', 'NOR'],
      hint: 'NAND(A,B) followed by XOR with C.',
    },
    {
      title: 'Stage 2 · Equivalence Multiplex',
      description: 'Synthesize (A ⊕ B) NOR C across all verification vectors.',
      inputs: { A: 0, B: 0, C: 0 },
      targetOut: 1,
      truthTestVectors: [
        { A: 0, B: 0, C: 0, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 1 },
        { A: 1, B: 0, C: 0, expected: 0 },
        { A: 0, B: 0, C: 1, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NAND', 'NOR'],
      hint: 'XOR detects difference; NOR inverts when C is 0.',
    },
    {
      title: 'Stage 3 · De Morgan Gate Match',
      description: 'Synthesize ~(A + B) · C without NOT gates.',
      inputs: { A: 0, B: 0, C: 1 },
      targetOut: 1,
      truthTestVectors: [
        { A: 0, B: 0, C: 1, expected: 1 },
        { A: 0, B: 1, C: 1, expected: 0 },
        { A: 1, B: 0, C: 1, expected: 0 },
        { A: 0, B: 0, C: 0, expected: 0 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NAND', 'NOR'],
      hint: 'De Morgan: ~(A + B) = NOR(A, B).',
    },
    {
      title: 'Stage 4 · Conditional Bus Suppress',
      description: 'Synthesize (A + B) NAND C across all verification vectors.',
      inputs: { A: 1, B: 0, C: 1 },
      targetOut: 0,
      truthTestVectors: [
        { A: 1, B: 0, C: 1, expected: 0 },
        { A: 0, B: 0, C: 1, expected: 1 },
        { A: 1, B: 1, C: 0, expected: 1 },
        { A: 0, B: 1, C: 0, expected: 1 },
      ],
      availableGates: ['AND', 'OR', 'XOR', 'NAND', 'NOR'],
      hint: 'OR(A, B) feeding NAND with C.',
    },
  ],
};

// Fix Honors Stage 2 & 3 truth vectors so they have exact unique solutions
CHALLENGES_BY_TIER.Honors[1] = {
  title: 'Stage 2 · Exclusive Gate Suppression',
  description: 'Output 1 only when A and B differ AND C is 1.',
  inputs: { A: 1, B: 0, C: 1 },
  targetOut: 1,
  truthTestVectors: [
    { A: 1, B: 0, C: 1, expected: 1 },
    { A: 0, B: 1, C: 1, expected: 1 },
    { A: 1, B: 1, C: 1, expected: 0 },
    { A: 1, B: 0, C: 0, expected: 0 },
  ],
  availableGates: ['AND', 'OR', 'XOR', 'NOR', 'NAND'],
  hint: 'XOR(A, B) checks difference, then AND with C.',
};

CHALLENGES_BY_TIER.Honors[2] = {
  title: 'Stage 3 · Inverted Product Gate',
  description: 'Compute NAND(A, B) OR C across all test vectors.',
  inputs: { A: 1, B: 1, C: 0 },
  targetOut: 0,
  truthTestVectors: [
    { A: 1, B: 1, C: 0, expected: 0 },
    { A: 1, B: 1, C: 1, expected: 1 },
    { A: 0, B: 1, C: 0, expected: 1 },
    { A: 1, B: 0, C: 0, expected: 1 },
  ],
  availableGates: ['NAND', 'OR', 'AND', 'XOR'],
  hint: 'Gate 1 = NAND(A, B), Gate 2 = OR(G1, C).',
};

export function getCircuitStages(difficulty: GameDifficulty): CircuitChallenge[] {
  if (difficulty === 'Beginner') return CHALLENGES_BY_TIER.Standard.slice(0, 3);
  if (difficulty === 'Intermediate') return CHALLENGES_BY_TIER.Standard;
  if (difficulty === 'Advanced') return CHALLENGES_BY_TIER.Honors;
  return CHALLENGES_BY_TIER.Olympiad;
}
