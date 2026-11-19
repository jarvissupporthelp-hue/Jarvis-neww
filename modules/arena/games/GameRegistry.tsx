import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ArenaGameId } from "../catalog";
import type { ActiveGameRenderProps } from "../game-types";

export const playableGames = {
  "logic-circuit-lab": dynamic(() => import("./LogicCircuitLab").then((m) => m.LogicCircuitLab)),
  "matrix-transform-arena": dynamic(() => import("./MatrixTransformArena").then((m) => m.MatrixTransformArena)),
  "algorithm-sort-duel": dynamic(() => import("./AlgorithmSortDuel").then((m) => m.AlgorithmSortDuel)),
  "binary-hex-bridge": dynamic(() => import("./BinaryHexBridge").then((m) => m.BinaryHexBridge)),
  "orbital-ballistics-sim": dynamic(() => import("./ProjectileMotionLab").then((m) => m.ProjectileMotionLab)),
  "stoichiometry-balancer": dynamic(() => import("./StoichiometryBalancer").then((m) => m.StoichiometryBalancer)),
  "equilibrium-market-sim": dynamic(() => import("./EquilibriumMarketSim").then((m) => m.EquilibriumMarketSim)),
  "cipher-breaker-lab": dynamic(() => import("./CipherBreakerLab").then((m) => m.CipherBreakerLab)),
  "calculus-integral-estimator": dynamic(() => import("./CalculusIntegralEstimator").then((m) => m.CalculusIntegralEstimator)),
  "periodic-element-forge": dynamic(() => import("./PeriodicElementForge").then((m) => m.PeriodicElementForge)),
} satisfies Record<ArenaGameId, ComponentType<ActiveGameRenderProps>>;
