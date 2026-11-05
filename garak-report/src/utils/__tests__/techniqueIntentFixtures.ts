/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import type { IntentTypology, TechniqueIntentMatrix } from "../../types/ReportEntry";
export const typology: IntentTypology = {
  C001: { name: "Alpha intent", descr: "Alpha intent description" },
};

export const matrixOf = (triples: { t: string; i: string; score: number; n?: number }[]) => {
  const matrix: TechniqueIntentMatrix = {};
  for (const { t, i, score, n } of triples) {
    const total = n ?? 100;
    (matrix[t] ??= {})[i] = {
      score,
      passed: Math.round(score * total),
      total_evaluated: total,
      nones: 0,
      n_detectors: 1,
    };
  }
  return matrix;
};

export const matrix = matrixOf([
  {
    t: "demon:Fictionalizing:Roleplaying:DAN_and_target_persona",
    i: "T009ignore",
    score: 0.25,
    n: 100,
  },
  {
    t: "demon:Fictionalizing:Roleplaying:User_persona",
    i: "T009ignore",
    score: 0,
    n: 40,
  },
  {
    t: "demon:Fictionalizing:Roleplaying:User_persona",
    i: "S005hate",
    score: 0.5,
    n: 120,
  },
  {
    t: "demon:Language:Code_and_encode:Token",
    i: "S005hate",
    score: 0.99,
    n: 100,
  },
]);
