import type { GameDifficulty } from '../game-types.ts';

interface CipherChallenge {
  title: string;
  plaintext: string;
  a: number; // multiplier mod 26 (coprime to 26; 1 for Caesar)
  b: number; // shift mod 26
  mode: 'Caesar' | 'Affine';
}

export const VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

export function modInverse(a: number, m = 26): number {
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x;
  }
  return 1;
}

export function encryptAffine(text: string, a: number, b: number): string {
  return text
    .toUpperCase()
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 65 || code > 90) return ch;
      const x = code - 65;
      const y = (a * x + b) % 26;
      return String.fromCharCode(65 + y);
    })
    .join('');
}

export function decryptAffine(cipher: string, a: number, b: number): string {
  const inv = modInverse(a, 26);
  return cipher
    .toUpperCase()
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 65 || code > 90) return ch;
      const y = code - 65;
      const x = (inv * ((y - b + 26 * 10) % 26)) % 26;
      return String.fromCharCode(65 + x);
    })
    .join('');
}

const CHALLENGES_BY_TIER: Record<'Standard' | 'Honors' | 'Olympiad', CipherChallenge[]> = {
  Standard: [
    {
      title: 'Caesar Shift · Classic Telemetry',
      plaintext: 'THE QUICK OBSERVER MEASURES THE EXACT ORBITAL VELOCITY',
      a: 1,
      b: 7,
      mode: 'Caesar',
    },
    {
      title: 'Caesar Shift · Logic Theorem',
      plaintext: 'EVERY FINITE BOOLEAN FUNCTION HAS A CANONICAL NORMAL FORM',
      a: 1,
      b: 14,
      mode: 'Caesar',
    },
    {
      title: 'Caesar Shift · Prime Modulus',
      plaintext: 'DISCRETE MATHEMATICS POWERS MODERN CRYPTOGRAPHIC PROTOCOLS',
      a: 1,
      b: 19,
      mode: 'Caesar',
    },
  ],
  Honors: [
    {
      title: 'Affine Cipher · Multiplier 3',
      plaintext: 'LINEAR ALGEBRA TRANSFORMS VECTOR SPACES WITH DETERMINISTIC PRECISION',
      a: 3,
      b: 5,
      mode: 'Affine',
    },
    {
      title: 'Affine Cipher · Multiplier 5',
      plaintext: 'CONSERVATION OF MOMENTUM HOLDS ACROSS ISOLATED PHYSICAL SYSTEMS',
      a: 5,
      b: 8,
      mode: 'Affine',
    },
    {
      title: 'Affine Cipher · Multiplier 7',
      plaintext: 'FREQUENCY ANALYSIS EXPOSES MONOALPHABETIC SUBSTITUTION WEAKNESSES',
      a: 7,
      b: 11,
      mode: 'Affine',
    },
  ],
  Olympiad: [
    {
      title: 'High-Order Affine · a = 9',
      plaintext: 'NUMBER THEORY AND MODULAR INVERSES FORM THE BEDROCK OF PUBLIC KEY SYSTEMS',
      a: 9,
      b: 13,
      mode: 'Affine',
    },
    {
      title: 'High-Order Affine · a = 11',
      plaintext: 'EIGENVALUES REVEAL INVARIANT DIRECTIONS UNDER MATRIX TRANSFORMATIONS',
      a: 11,
      b: 4,
      mode: 'Affine',
    },
    {
      title: 'High-Order Affine · a = 15',
      plaintext: 'SHANNON ENTROPY QUANTIFIES THE UNCERTAINTY OF ANY INFORMATION SOURCE',
      a: 15,
      b: 17,
      mode: 'Affine',
    },
  ],
};

export function getCipherChallenges(difficulty: GameDifficulty): CipherChallenge[] {
  if (difficulty === 'Beginner') return CHALLENGES_BY_TIER.Standard.slice(0, 2);
  if (difficulty === 'Intermediate') return CHALLENGES_BY_TIER.Standard;
  if (difficulty === 'Advanced') return CHALLENGES_BY_TIER.Honors;
  return CHALLENGES_BY_TIER.Olympiad;
}
