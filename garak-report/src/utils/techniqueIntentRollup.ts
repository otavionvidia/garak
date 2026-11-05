/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

/** Build the report's digest-driven matrix and worst-first axis order. */
import type { IntentTypology, TechniqueIntentMatrix } from "../types/ReportEntry";
import type { MatrixCell, MatrixView } from "../types/TechniqueIntent";
import { flatten } from "./flattenTechniqueIntent";
import {
  shortenTechnique,
  intentName as typologyIntentName,
  intentDescription as typologyIntentDescription,
} from "./taxonomyLabels";
export { buildAxisGroups } from "./techniqueIntentGroups";
export type {
  MatrixCell,
  MatrixView,
  TaxonomyAxis,
  AxisCell,
  AxisGroup,
} from "../types/TechniqueIntent";

/**
 * Builds a {@link MatrixView} from a raw technique_intent matrix.
 */
export function buildMatrixView(
  matrix: TechniqueIntentMatrix,
  typology?: IntentTypology
): MatrixView {
  const entries = flatten(matrix);

  // Prefer digest-supplied taxonomy labels while retaining matrix metadata and
  // raw keys as fallbacks for older reports and unknown codes.
  const techniqueNames = new Map<string, string>();
  const techniqueDescriptions = new Map<string, string>();
  const intentNames = new Map<string, string>();
  for (const entry of entries) {
    if (entry.techniqueName) techniqueNames.set(entry.technique, entry.techniqueName);
    if (entry.techniqueDescription) {
      techniqueDescriptions.set(entry.technique, entry.techniqueDescription);
    }
    if (entry.intentName) intentNames.set(entry.intent, entry.intentName);
  }
  const rowLabel = (key: string) => techniqueNames.get(key) ?? shortenTechnique(key);
  // Intent columns keep their taxonomy code visible alongside the name
  // ("C006 - Anthropomorphise") so the slug is unambiguous; codes with no known
  // name fall back to the bare code.
  const colLabel = (key: string) => {
    const name = typologyIntentName(key, typology) ?? intentNames.get(key);
    return name ? `${key} - ${name}` : key;
  };
  const rowDescription = (key: string) => techniqueDescriptions.get(key);
  const colDescription = (key: string) => typologyIntentDescription(key, typology);

  // Index each pairing by "row\u0000col".
  const cellMap = new Map<string, MatrixCell>();
  const cellKey = (row: string, col: string) => `${row}\u0000${col}`;
  for (const entry of entries) {
    cellMap.set(cellKey(entry.technique, entry.intent), {
      row: entry.technique,
      col: entry.intent,
      score: entry.score,
      nEvaluations: entry.nEvaluations,
      nAttempts: entry.nAttempts,
      passed: entry.passed,
      nones: entry.nones,
      nDetectors: entry.nDetectors,
    });
  }

  // Worst-first ordering for axes: a row/column's rank is its worst cell.
  const rowWorst = new Map<string, number>();
  const colWorst = new Map<string, number>();
  for (const cell of cellMap.values()) {
    rowWorst.set(cell.row, Math.min(rowWorst.get(cell.row) ?? 1, cell.score));
    colWorst.set(cell.col, Math.min(colWorst.get(cell.col) ?? 1, cell.score));
  }
  const byWorstThenName = (worst: Map<string, number>) => (a: string, b: string) => {
    const diff = (worst.get(a) ?? 1) - (worst.get(b) ?? 1);
    return diff !== 0 ? diff : a.localeCompare(b);
  };
  const rows = [...rowWorst.keys()].sort(byWorstThenName(rowWorst));
  const cols = [...colWorst.keys()].sort(byWorstThenName(colWorst));

  return {
    rows,
    cols,
    rowLabel,
    colLabel,
    rowDescription,
    colDescription,
    cell: (row, col) => cellMap.get(cellKey(row, col)),
  };
}
