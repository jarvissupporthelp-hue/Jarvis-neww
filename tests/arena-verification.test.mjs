import assert from "node:assert/strict";
import test from "node:test";
import { arenaGames } from "../modules/arena/catalog.ts";
import { gameDifficulties } from "../modules/arena/game-types.ts";
import { arenaProgress } from "../modules/arena/progression.ts";
import { verifiesArenaClear } from "../modules/arena/verify.ts";
import { getSortPuzzles } from "../modules/arena/rules/AlgorithmSortDuel.ts";
import { getBinaryPuzzles } from "../modules/arena/rules/BinaryHexBridge.ts";
import { estimateIntegral, getIntegralProblems } from "../modules/arena/rules/CalculusIntegralEstimator.ts";
import { getCipherChallenges } from "../modules/arena/rules/CipherBreakerLab.ts";
import { getMarketScenarios, marketEquilibrium } from "../modules/arena/rules/EquilibriumMarketSim.ts";
import { evalGate, getCircuitStages } from "../modules/arena/rules/LogicCircuitLab.ts";
import { getMatrixChallenges } from "../modules/arena/rules/MatrixTransformArena.ts";
import { getElementTargets } from "../modules/arena/rules/PeriodicElementForge.ts";
import { computeTrajectory, getLandingChallenges } from "../modules/arena/rules/ProjectileMotionLab.ts";
import { atomInventory, getEquations } from "../modules/arena/rules/StoichiometryBalancer.ts";

function coefficientSets(count) {
  if (count === 0) return [[]];
  const shorter = coefficientSets(count - 1);
  return Array.from({ length: 12 }, (_, index) => shorter.map((suffix) => [index + 1, ...suffix])).flat();
}

const solutions = {
  "logic-circuit-lab": (tier) => ["stages", getCircuitStages(tier).map((stage) =>
    stage.availableGates.flatMap((gate1) => stage.availableGates.map((gate2) => ({ gate1, gate2 })))
      .find(({ gate1, gate2 }) => stage.truthTestVectors.every(({ A, B, C, expected }) =>
        evalGate(gate2, evalGate(gate1, A, B), C) === expected)))],
  "matrix-transform-arena": (tier) => ["matrices", getMatrixChallenges(tier).map((round) => round.targetMatrix)],
  "algorithm-sort-duel": (tier) => ["sorted_arrays", getSortPuzzles(tier).map((round) => [...round.initial].sort((a, b) => a - b))],
  "binary-hex-bridge": (tier) => ["bytes", getBinaryPuzzles(tier).map((round) => round.targetByte)],
  "stoichiometry-balancer": (tier) => ["answers", getEquations(tier).map((round) => {
    const products = coefficientSets(round.products.length);
    for (const left of coefficientSets(round.reactants.length)) {
      const right = products.find((set) => atomInventory(round, left, set).every(({ balanced }) => balanced));
      if (right) return [left, right];
    }
  })],
  "equilibrium-market-sim": (tier) => ["answers", getMarketScenarios(tier).map((round) => Math.round(marketEquilibrium(round).eqP))],
  "cipher-breaker-lab": (tier) => ["answers", getCipherChallenges(tier).map(({ a, b }) => [a, b])],
  "calculus-integral-estimator": (tier) => ["answers", getIntegralProblems(tier).map((round) => {
    for (const method of ["Left", "Right", "Midpoint", "Trapezoid"]) {
      for (let n = 1; n <= round.maxPartitionsAllowed; n++) {
        if (Math.abs(estimateIntegral(round, n, method).estimate - round.exactArea) <= round.tolerance) return [method, n];
      }
    }
  })],
  "periodic-element-forge": (tier) => ["answers", getElementTargets(tier).map(({ protons, neutrons, electrons }) => {
    assert.ok(protons <= 20 && neutrons <= 24 && electrons <= 18);
    return [protons, neutrons, electrons];
  })],
  "orbital-ballistics-sim": (tier) => ["answers", getLandingChallenges(tier).map((round) => {
    for (let angle = 10; angle <= 80; angle++) {
      for (let speed = 10; speed <= 50; speed += 0.5) {
        const { landingX } = computeTrajectory(angle, speed, round.gravity, round.windAccel);
        if (Math.abs(landingX - round.targetX) <= round.tolerance) return [angle, speed];
      }
    }
  })],
};

for (const { id } of arenaGames) {
  test(`${id} verifies complete solutions across all difficulties`, () => {
    for (const tier of gameDifficulties) {
      const [key, answers] = solutions[id](tier);
      assert.ok(answers.every((answer) => answer !== undefined), `Unsolvable round at ${tier}`);
      assert.equal(verifiesArenaClear(id, tier, { [key]: answers }), true, tier);
      assert.equal(verifiesArenaClear(id, tier, { [key]: [null, ...answers.slice(1)], score: 1000, xp: 150 }), false, tier);
      assert.equal(verifiesArenaClear(id, tier, { [key]: answers.slice(1) }), false, tier);
      assert.equal(verifiesArenaClear(id, tier, { [key]: [...answers, answers[0]] }), false, tier);
    }
  });
}

test("Arena progression follows the XP level curve and league thresholds", () => {
  assert.deepEqual(arenaProgress(0), { level: 1, league: "Iron" });
  assert.deepEqual(arenaProgress(100), { level: 2, league: "Iron" });
  assert.deepEqual(arenaProgress(499), { level: 3, league: "Iron" });
  assert.deepEqual(arenaProgress(500), { level: 3, league: "Bronze" });
  assert.equal(arenaProgress(1500).league, "Silver");
  assert.equal(arenaProgress(20000).league, "Legend");
});

test("sorting practice par equals the minimum number of swaps for each array", () => {
  for (const tier of gameDifficulties) {
    for (const puzzle of getSortPuzzles(tier)) {
      const remaining = [...puzzle.initial];
      assert.equal(new Set(remaining).size, remaining.length, "Sorting puzzles use distinct values");
      let swaps = 0;
      for (let index = 0; index < remaining.length; index++) {
        let smallest = index;
        for (let j = index + 1; j < remaining.length; j++) {
          if (remaining[j] < remaining[smallest]) smallest = j;
        }
        if (smallest === index) continue;
        [remaining[smallest], remaining[index]] = [remaining[index], remaining[smallest]];
        swaps++;
      }
      assert.equal(puzzle.parSwaps, swaps, puzzle.title);
    }
  }
});
