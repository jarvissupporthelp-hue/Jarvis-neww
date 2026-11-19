import type { ArenaGameId } from "./catalog.ts";
import type { GameDifficulty } from "./game-types.ts";
import { getSortPuzzles } from "./rules/AlgorithmSortDuel.ts";
import { getBinaryPuzzles } from "./rules/BinaryHexBridge.ts";
import { estimateIntegral, getIntegralProblems } from "./rules/CalculusIntegralEstimator.ts";
import { decryptAffine, encryptAffine, getCipherChallenges } from "./rules/CipherBreakerLab.ts";
import { getMarketScenarios, marketEquilibrium } from "./rules/EquilibriumMarketSim.ts";
import { evalGate, getCircuitStages } from "./rules/LogicCircuitLab.ts";
import { getMatrixChallenges } from "./rules/MatrixTransformArena.ts";
import { getElementTargets } from "./rules/PeriodicElementForge.ts";
import { computeTrajectory, getLandingChallenges } from "./rules/ProjectileMotionLab.ts";
import { atomInventory, getEquations } from "./rules/StoichiometryBalancer.ts";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function exactArray(actual: unknown, expected: number[]) {
  return Array.isArray(actual) && actual.length === expected.length && expected.every((value, i) => actual[i] === value);
}

function numberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return numberInRange(value, min, max) && Number.isInteger(value);
}

function coefficients(answer: unknown, count: number): answer is number[] {
  return Array.isArray(answer) && answer.length === count && answer.every((value) => integerInRange(value, 1, 12));
}

function verifyRounds<T>(rounds: readonly T[], answers: unknown, validate: (round: T, answer: unknown) => boolean) {
  return Array.isArray(answers) && answers.length === rounds.length && rounds.every((round, i) => validate(round, answers[i]));
}

export function verifiesArenaClear(game: ArenaGameId, difficulty: GameDifficulty, payload: unknown) {
  const proof = object(payload);
  switch (game) {
    case "logic-circuit-lab":
      return verifyRounds(getCircuitStages(difficulty), proof.stages, (stage, answer) => {
        const { gate1, gate2 } = object(answer);
        const first = stage.availableGates.find((gate) => gate === gate1);
        const second = stage.availableGates.find((gate) => gate === gate2);
        return first !== undefined && second !== undefined && stage.truthTestVectors.every(({ A, B, C, expected }) =>
          evalGate(second, evalGate(first, A, B), C) === expected);
      });
    case "matrix-transform-arena":
      return verifyRounds(getMatrixChallenges(difficulty), proof.matrices, (round, answer) => exactArray(answer, round.targetMatrix));
    case "algorithm-sort-duel":
      return verifyRounds(getSortPuzzles(difficulty), proof.sorted_arrays, (round, answer) =>
        exactArray(answer, [...round.initial].sort((a, b) => a - b)));
    case "binary-hex-bridge":
      return verifyRounds(getBinaryPuzzles(difficulty), proof.bytes, (round, answer) => answer === round.targetByte);
    case "stoichiometry-balancer":
      return verifyRounds(getEquations(difficulty), proof.answers, (round, answer) => {
        if (!Array.isArray(answer) || answer.length !== 2) return false;
        const [left, right] = answer;
        return coefficients(left, round.reactants.length) && coefficients(right, round.products.length) &&
          atomInventory(round, left, right).every(({ balanced }) => balanced);
      });
    case "equilibrium-market-sim":
      return verifyRounds(getMarketScenarios(difficulty), proof.answers, (round, answer) =>
        integerInRange(answer, 10, 120) && Math.abs(answer - marketEquilibrium(round).eqP) <= 1.5);
    case "cipher-breaker-lab":
      return verifyRounds(getCipherChallenges(difficulty), proof.answers, (round, answer) => {
        if (!Array.isArray(answer) || answer.length !== 2) return false;
        const [a, b] = answer;
        return a === round.a && b === round.b &&
          decryptAffine(encryptAffine(round.plaintext, round.a, round.b), a, b) === round.plaintext;
      });
    case "calculus-integral-estimator":
      return verifyRounds(getIntegralProblems(difficulty), proof.answers, (round, answer) => {
        if (!Array.isArray(answer) || answer.length !== 2) return false;
        const [method, n] = answer;
        if (method !== "Left" && method !== "Right" && method !== "Midpoint" && method !== "Trapezoid") return false;
        return integerInRange(n, 1, round.maxPartitionsAllowed) &&
          Math.abs(estimateIntegral(round, n, method).estimate - round.exactArea) <= round.tolerance;
      });
    case "periodic-element-forge":
      return verifyRounds(getElementTargets(difficulty), proof.answers, (round, answer) =>
        exactArray(answer, [round.protons, round.neutrons, round.electrons]));
    case "orbital-ballistics-sim":
      return verifyRounds(getLandingChallenges(difficulty), proof.answers, (round, answer) => {
        if (!Array.isArray(answer) || answer.length !== 2) return false;
        const [angle, speed] = answer;
        return integerInRange(angle, 10, 80) && numberInRange(speed, 10, 50) && Number.isInteger(speed * 2) &&
          Math.abs(computeTrajectory(angle, speed, round.gravity, round.windAccel).landingX - round.targetX) <= round.tolerance;
      });
  }
}
