import type { Module, MathFact } from './types';

export const MODULES: Module[] = [
  { id: 'functions', label: 'Functions & Calculus', icon: '∫', color: '#3B82F6', description: 'Plot, differentiate, and analyze functions in 2D' },
  { id: 'integrals', label: 'Riemann Lab', icon: '∑', color: '#06B6D4', description: 'Visualize Riemann sums and definite integrals' },
  { id: 'matrices', label: 'Matrices & Linear Algebra', icon: '[A]', color: '#10B981', description: 'Transform grids, eigenvalues, determinants' },
  { id: 'vectors', label: 'Vectors & Physics', icon: '→', color: '#F59E0B', description: 'Drag vectors, cross products, dot products' },
  { id: 'limits', label: 'Limits & Sequences', icon: 'lim', color: '#EF4444', description: 'Epsilon-delta, one-sided limits, convergence' },
  { id: 'trigonometry', label: 'Trigonometry', icon: '∿', color: '#8B5CF6', description: 'Unit circle + live waveform sync view' },
  { id: 'complex', label: 'Complex Numbers', icon: 'ℂ', color: '#EC4899', description: 'Argand plane, multiplication, Euler\'s formula' },
  { id: 'probability', label: 'Probability & Statistics', icon: 'P', color: '#14B8A6', description: 'Distributions, simulations, histograms' },
];

export const MATH_FACTS: MathFact[] = [
  { text: "e^(iπ) + 1 = 0 — Euler's identity, called the most beautiful equation in mathematics." },
  { text: "The derivative of e^x is itself — e^x is its own rate of change." },
  { text: "There are as many even numbers as there are integers (both are infinite, countably)." },
  { text: "The number π appears in probability: √(2π) is in the Gaussian distribution." },
  { text: "A Klein bottle is a surface with no inside or outside — it exists in 4D." },
  { text: "The Riemann hypothesis, about primes, is worth $1,000,000 if solved." },
  { text: "Fourier showed any wave can be decomposed into a sum of sine waves." },
  { text: "sin²(x) + cos²(x) = 1 for every single value of x — always, forever." },
  { text: "The golden ratio φ = (1+√5)/2 ≈ 1.618 appears in nature, art, and spirals." },
  { text: "Calculus was independently invented by Newton and Leibniz in the 17th century." },
  { text: "The determinant of a matrix tells you the signed area scaling factor of its linear transformation." },
  { text: "i² = −1 extended math into the complex plane, unlocking quantum mechanics." },
];

export const INTERESTING_PRESETS = [
  { id: 'functions', params: { expr: 'sin(x)*cos(x/2)', xMin: -6.28, xMax: 6.28 }, label: 'Butterfly Wave' },
  { id: 'functions', params: { expr: 'x*sin(1/x)', xMin: -1, xMax: 1 }, label: 'Wild Oscillation' },
  { id: 'functions', params: { expr: 'abs(sin(x))*x', xMin: -8, xMax: 8 }, label: 'Growing Ripple' },
  { id: 'trigonometry', params: { amplitude: 2, frequency: 3, phase: 1 }, label: 'Fast Sine' },
  { id: 'integrals', params: { expr: 'sin(x)', a: 0, b: 3.14159, n: 8 }, label: 'π Area' },
  { id: 'probability', params: { mode: 'normal', n: 1000 }, label: 'Bell Curve' },
];
