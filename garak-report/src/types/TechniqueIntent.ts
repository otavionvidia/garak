/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

/** Technique/intent matrix and axis summaries supplied to report components. */
/** A single technique × intent matrix cell. */
export interface MatrixCell {
  row: string;
  col: string;
  /** 0-1 pass rate for this pairing. */
  score: number;
  /** Total evaluations for the pairing. */
  nEvaluations: number;
  /** Distinct prompts for the pairing (0 on older reports). */
  nAttempts: number;
  /** Passing evaluations. */
  passed: number;
  /** Undetermined evaluations. */
  nones: number;
  /** Detectors that scored the pairing. */
  nDetectors: number;
}

/** A fully built, renderable matrix. */
export interface MatrixView {
  rows: string[];
  cols: string[];
  rowLabel: (key: string) => string;
  colLabel: (key: string) => string;
  /** Technique description for a row key, when the taxonomy provides one. */
  rowDescription: (key: string) => string | undefined;
  /** Intent description for a column key, when known. */
  colDescription: (key: string) => string | undefined;
  cell: (row: string, col: string) => MatrixCell | undefined;
}

/** Technique and intent axes. */
export type TaxonomyAxis = "technique" | "intent";

/** One nested (cross-axis) entry under an {@link AxisGroup}. */
export interface AxisCell {
  /** Cross-axis key (the intent under a technique, or technique under an intent). */
  otherKey: string;
  /** Display label for the cross-axis key. */
  otherLabel: string;
  /** The underlying matrix cell for this pairing. */
  cell: MatrixCell;
}

/**
 * A primary-axis summary: a technique (with its intents)
 * or an intent (with its techniques). Scored conservatively — the group score
 * is its worst child cell — to stay consistent with the heatmap.
 */
export interface AxisGroup {
  /** Active-level primary key (row or column key). */
  key: string;
  /** Display label for the primary key. */
  label: string;
  /** Taxonomy description for the primary key, when known. */
  description?: string;
  /** Worst (minimum) child-cell score — the conservative summary. */
  score: number;
  /** Total evaluations pooled across the group's cells. */
  nEvaluations: number;
  /** Total distinct prompts pooled across the group's cells (0 on older reports). */
  nAttempts: number;
  /** Worst-first cross-axis entries. */
  cells: AxisCell[];
}
