/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import type { AxisCell, AxisGroup, MatrixView, TaxonomyAxis } from "../types/TechniqueIntent";

/**
 * Reshapes a {@link MatrixView} into worst-first {@link AxisGroup}s for the
 * axis summaries. With `axis="technique"` each group is a technique row and its
 * cells are the intents it was probed against; with `axis="intent"` the roles
 * swap. The primary order follows the view's own worst-first axis ordering, and
 * each group's cells are sorted worst-first, so the most-vulnerable items surface
 * first in both dimensions.
 *
 * @param view - A built matrix view
 * @param axis - Which axis to make primary
 */
export function buildAxisGroups(view: MatrixView, axis: TaxonomyAxis): AxisGroup[] {
  const primaries = axis === "technique" ? view.rows : view.cols;
  const secondaries = axis === "technique" ? view.cols : view.rows;
  const primaryLabel = axis === "technique" ? view.rowLabel : view.colLabel;
  const secondaryLabel = axis === "technique" ? view.colLabel : view.rowLabel;
  // Both axes now carry a taxonomy description (technique rows, intent columns).
  const primaryDescription = axis === "technique" ? view.rowDescription : view.colDescription;
  const cellOf = (primary: string, secondary: string) =>
    axis === "technique" ? view.cell(primary, secondary) : view.cell(secondary, primary);

  const groups: AxisGroup[] = [];
  for (const primary of primaries) {
    const cells: AxisCell[] = [];
    for (const secondary of secondaries) {
      const cell = cellOf(primary, secondary);
      if (cell) cells.push({ otherKey: secondary, otherLabel: secondaryLabel(secondary), cell });
    }
    if (!cells.length) continue;
    cells.sort((a, b) => a.cell.score - b.cell.score);
    groups.push({
      key: primary,
      label: primaryLabel(primary),
      description: primaryDescription?.(primary),
      score: Math.min(...cells.map(c => c.cell.score)),
      nEvaluations: cells.reduce((sum, c) => sum + c.cell.nEvaluations, 0),
      nAttempts: cells.reduce((sum, c) => sum + c.cell.nAttempts, 0),
      cells,
    });
  }
  return groups;
}
