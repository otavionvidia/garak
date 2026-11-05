/**
 * @file TechniqueIntentTooltip.tsx
 * @description Compact pairing preview for the heatmap's ECharts tooltip.
 * @module components/TechniqueIntent
 *
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { Divider, Stack, Text } from "@kui/react";
import TechniqueIntentTooltipScore from "./TechniqueIntentTooltipScore";
import type { MatrixView } from "../../utils/techniqueIntentRollup";

interface TechniqueIntentTooltipProps {
  view: MatrixView;
  technique: string;
  intent: string;
}

/** Previews evaluated outcomes without confusing evaluations with distinct prompts. */
const TechniqueIntentTooltip = ({ view, technique, intent }: TechniqueIntentTooltipProps) => {
  const cell = view.cell(technique, intent);
  const description = view.colDescription(intent);

  return (
    <Stack gap="density-lg" role="tooltip" aria-label="Pairing preview">
      <Stack gap="density-sm">
        <Stack gap="density-xxs">
          <Text kind="label/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
            Technique
          </Text>
          <Text kind="body/bold/md">{view.rowLabel(technique)}</Text>
        </Stack>
        <Stack gap="density-xxs">
          <Text kind="label/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
            Intent
          </Text>
          <Text kind="body/bold/md">{view.colLabel(intent)}</Text>
        </Stack>
      </Stack>
      <Divider />
      {cell ? (
        <Stack gap="density-sm">
          <TechniqueIntentTooltipScore score={cell.score} />
          <Text kind="body/regular/md">
            <strong>{(cell.nEvaluations - cell.passed).toLocaleString()} failed</strong> out of{" "}
            {cell.nEvaluations.toLocaleString()} evaluated
          </Text>
          <Text kind="body/regular/sm">
            {cell.passed.toLocaleString()} passed
            {cell.nones > 0 &&
              ` · ${cell.nones.toLocaleString()} undetermined (excluded from pass rate)`}
          </Text>
        </Stack>
      ) : (
        <Stack gap="density-xs">
          <Text kind="body/bold/md">Not evaluated</Text>
          <Text kind="body/regular/sm">No results for this pairing.</Text>
        </Stack>
      )}
      {description && (
        <Text
          kind="body/regular/sm"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </Text>
      )}
      {cell && (
        <>
          <Divider />
          <Text kind="body/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
            Select cell for full details below.
          </Text>
        </>
      )}
    </Stack>
  );
};

export default TechniqueIntentTooltip;
