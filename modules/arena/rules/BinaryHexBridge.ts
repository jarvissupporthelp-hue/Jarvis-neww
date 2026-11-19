import type { GameDifficulty } from '../game-types.ts';

interface RegisterPuzzle {
  title: string;
  prompt: string;
  targetByte: number;
  startByte: number;
  displayTargetAs: 'HEX' | 'DECIMAL' | 'EXPRESSION';
}

const PUZZLES_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', RegisterPuzzle[]> = {
  Standard: [
    {
      title: 'Round 1 · Decimal to 8-Bit Register',
      prompt: 'Set the 8-bit register bits to represent decimal 45.',
      targetByte: 45,
      startByte: 0,
      displayTargetAs: 'DECIMAL',
    },
    {
      title: 'Round 2 · Hexadecimal Nibble Synthesis',
      prompt: 'Configure the byte register to match hexadecimal 0xA6.',
      targetByte: 0xa6,
      startByte: 0,
      displayTargetAs: 'HEX',
    },
    {
      title: 'Round 3 · Bitmask Parity',
      prompt: 'Set the register to decimal 153 (0x99).',
      targetByte: 153,
      startByte: 0,
      displayTargetAs: 'DECIMAL',
    },
    {
      title: 'Round 4 · High-Byte Address',
      prompt: 'Configure the register to match hexadecimal 0xD3.',
      targetByte: 0xd3,
      startByte: 0,
      displayTargetAs: 'HEX',
    },
  ],
  Honors: [
    {
      title: 'Round 1 · Bitwise OR Mask',
      prompt: 'Synthesize (0x34 | 0x82) on the 8-bit register.',
      targetByte: 0x34 | 0x82,
      startByte: 0x34,
      displayTargetAs: 'EXPRESSION',
    },
    {
      title: 'Round 2 · Bitwise XOR Toggle',
      prompt: 'Synthesize (0b10101100 ^ 0b01100101).',
      targetByte: 0b10101100 ^ 0b01100101,
      startByte: 0b10101100,
      displayTargetAs: 'EXPRESSION',
    },
    {
      title: 'Round 3 · Left Shift Multiplication',
      prompt: 'Synthesize (0x1B << 2) & 0xFF.',
      targetByte: (0x1b << 2) & 0xff,
      startByte: 0x1b,
      displayTargetAs: 'EXPRESSION',
    },
    {
      title: 'Round 4 · Bitwise AND Clear',
      prompt: 'Synthesize (0xF7 & 0x5D).',
      targetByte: 0xf7 & 0x5d,
      startByte: 0xf7,
      displayTargetAs: 'EXPRESSION',
    },
  ],
  Olympiad: [
    {
      title: 'Round 1 · Compound Shift & XOR',
      prompt: 'Synthesize ((0x2D << 1) ^ 0xA5) & 0xFF.',
      targetByte: ((0x2d << 1) ^ 0xa5) & 0xff,
      startByte: 0x2d,
      displayTargetAs: 'EXPRESSION',
    },
    {
      title: 'Round 2 · Bitwise Complement Mask',
      prompt: 'Synthesize (~0x4B) & 0xFF.',
      targetByte: ~0x4b & 0xff,
      startByte: 0x4b,
      displayTargetAs: 'EXPRESSION',
    },
    {
      title: 'Round 3 · Two’s Complement Negation',
      prompt: 'Compute the 8-bit two’s complement of +54 (i.e., (~54 + 1) & 0xFF).',
      targetByte: (~54 + 1) & 0xff,
      startByte: 54,
      displayTargetAs: 'EXPRESSION',
    },
    {
      title: 'Round 4 · High/Low Nibble Swap',
      prompt: 'Swap the two 4-bit nibbles of 0x7C (result: ((0x7C & 0x0F) << 4) | (0x7C >> 4)).',
      targetByte: ((0x7c & 0x0f) << 4) | (0x7c >> 4),
      startByte: 0x7c,
      displayTargetAs: 'EXPRESSION',
    },
  ],
};

export const BIT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

export function getBinaryPuzzles(difficulty: GameDifficulty): RegisterPuzzle[] {
  if (difficulty === 'Beginner') return PUZZLES_BY_TIER.Standard.slice(0, 3);
  if (difficulty === 'Intermediate') return PUZZLES_BY_TIER.Standard;
  if (difficulty === 'Advanced') return PUZZLES_BY_TIER.Honors;
  return PUZZLES_BY_TIER.Olympiad;
}
