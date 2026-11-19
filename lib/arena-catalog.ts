export type ArenaDiscipline = "Computer Science" | "Mathematics" | "Physics" | "Chemistry" | "Economics";
export type ArenaGame = {
  id: string; title: string; discipline: ArenaDiscipline; description: string;
  instructions: string; icon: string;
};
/**
 * The game catalogue follows the ten activities supplied in jarvis-arena.zip.
 * These in-browser exercises are practice only. Server-issued XP is intentionally
 * not implemented until authoritative scoring and Supabase RLS are ready.
 */
export const arenaGames: readonly ArenaGame[] = [
  { id:"logic-circuit-lab",title:"Logic Circuit Lab",discipline:"Computer Science",icon:"⚡",description:"Experiment with digital logic gates and Boolean signals.",instructions:"Create an output of 1 using the selected gate and input switches." },
  { id:"orbital-ballistics-sim",title:"Projectile Ballistics Sim",discipline:"Physics",icon:"🚀",description:"Tune a launch angle and speed to reach a target.",instructions:"Adjust launch angle and velocity until the range is within 2 meters of the target." },
  { id:"matrix-transform-arena",title:"Matrix Transform Arena",discipline:"Mathematics",icon:"▦",description:"Apply a 2×2 transformation to a vector.",instructions:"Find the transform that maps (2, 1) to (-1, 2)." },
  { id:"algorithm-sort-duel",title:"Algorithm Sort Duel",discipline:"Computer Science",icon:"↕",description:"Sort an array by making individual adjacent swaps.",instructions:"Select an adjacent pair and swap until the array is sorted." },
  { id:"stoichiometry-balancer",title:"Stoichiometry Balancer",discipline:"Chemistry",icon:"⚗",description:"Balance a chemical equation using coefficients.",instructions:"Balance hydrogen and oxygen on both sides of H₂ + O₂ → H₂O." },
  { id:"equilibrium-market-sim",title:"Equilibrium Market Sim",discipline:"Economics",icon:"📈",description:"Adjust the price to match market supply and demand.",instructions:"Set a price at which supplied quantity equals demanded quantity." },
  { id:"cipher-breaker-lab",title:"Cipher Breaker Lab",discipline:"Computer Science",icon:"🔐",description:"Decode a classical Caesar cipher.",instructions:"Decrypt KHOOR using the right Caesar shift." },
  { id:"binary-hex-bridge",title:"Binary & Bitwise Bridge",discipline:"Computer Science",icon:"⌘",description:"Flip binary register switches to match a hex value.",instructions:"Set the 8-bit register to hexadecimal A5." },
  { id:"calculus-integral-estimator",title:"Riemann Integral Lab",discipline:"Mathematics",icon:"∫",description:"Approximate the integral of x² from 0 to 1.",instructions:"Increase the number of trapezoids until the approximation is within 0.005 of the exact integral." },
  { id:"periodic-element-forge",title:"Atomic Orbital Forge",discipline:"Chemistry",icon:"⚛",description:"Build a neutral carbon-12 atom from particles.",instructions:"Set protons, neutrons, and electrons to match a neutral carbon-12 atom." },
];
