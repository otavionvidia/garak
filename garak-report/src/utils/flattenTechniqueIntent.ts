/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import type { TechniqueIntentCell, TechniqueIntentMatrix } from "../types/ReportEntry";

/** A single technique × intent pairing from the digest. */
interface MatrixEntry {
  technique: string;
  intent: string;
  /** Human-readable technique name (falls back to the key when absent). */
  techniqueName?: string;
  /** Technique description from the taxonomy, when available. */
  techniqueDescription?: string;
  /** Human-readable intent name (falls back to the code when absent). */
  intentName?: string;
  /** 0-1 pass rate. Pairings the digest left unevaluated (null) are dropped. */
  score: number;
  nEvaluations: number;
  /** Prompt count supplied by the digest, or zero on older reports. */
  nAttempts: number;
  passed: number;
  /** Undetermined evaluations (detector returned no verdict). */
  nones: number;
  /** Detectors that scored this pairing (a count; the digest carries no names). */
  nDetectors: number;
}

export const flatten = (matrix: TechniqueIntentMatrix): MatrixEntry[] => {
  const entries: MatrixEntry[] = [];
  for (const technique of Object.keys(matrix)) {
    const row = matrix[technique];
    const summary = row._summary;
    for (const intent of Object.keys(row)) {
      if (intent === "_summary") continue; // reserved per-row summary, not a cell
      const cell = row[intent] as TechniqueIntentCell | undefined;
      // A null score (or nothing evaluated) means this pairing was never probed —
      // drop it so it can't land in the severity bands or worst-first ordering.
      if (!cell || cell.score == null || cell.total_evaluated === 0) continue;
      entries.push({
        technique,
        intent,
        techniqueName: summary?.name ?? undefined,
        techniqueDescription: summary?.description ?? undefined,
        intentName: cell.name ?? undefined,
        score: cell.score,
        nEvaluations: cell.total_evaluated,
        nAttempts: cell.n_attempts ?? 0,
        passed: cell.passed,
        nones: cell.nones,
        nDetectors: cell.n_detectors,
      });
    }
  }
  return entries;
};
