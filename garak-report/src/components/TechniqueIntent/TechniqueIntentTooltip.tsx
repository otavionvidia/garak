/**
 * @file TechniqueIntentTooltip.tsx
 * @description Compact pairing preview for the heatmap's ECharts tooltip.
 * @module components/TechniqueIntent
 *
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { Badge, Divider, Flex, Stack, Text } from "@kui/react";
import { DEFCON_BADGE_COLORS, DEFCON_LABELS, scoreToDefcon } from "../../constants";
import { formatRate } from "../../utils/formatPercentage";
import type { AxisGroup, MatrixView, TaxonomyAxis } from "../../utils/techniqueIntentRollup";

interface TechniqueIntentTooltipProps {
  view: MatrixView;
  technique: string;
  intent: string;
}

/** Previews evaluated outcomes without confusing evaluations with distinct prompts. */
const TechniqueIntentTooltip = ({ view, technique, intent }: TechniqueIntentTooltipProps) => {
  const cell = view.cell(technique, intent);
  const level = cell ? scoreToDefcon(cell.score) : undefined;
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
      {cell && level ? (
        <Stack gap="density-sm">
          <Flex align="center" justify="between" gap="density-md">
            <Stack gap="density-xxs">
              <Text kind="title/md">{formatRate(cell.score)}</Text>
              <Text kind="label/regular/sm">Pass rate</Text>
            </Stack>
            <Stack gap="density-xs" align="end">
              <Badge color={DEFCON_BADGE_COLORS[level]} kind="solid">
                DC-{level}
              </Badge>
              <Text kind="label/regular/sm">{DEFCON_LABELS[level]}</Text>
            </Stack>
          </Flex>
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

interface TechniqueIntentAxisTooltipProps {
  group: AxisGroup;
  axis: TaxonomyAxis;
  total: number;
}

/** Summarises an axis using the same worst-pairing score as the existing lists. */
export const TechniqueIntentAxisTooltip = ({
  group,
  axis,
  total,
}: TechniqueIntentAxisTooltipProps) => {
  const level = scoreToDefcon(group.score);
  const worst = group.cells[0];
  const tied = group.cells.filter(item => item.cell.score === group.score).length - 1;
  const failed = group.cells.reduce(
    (sum, item) => sum + item.cell.nEvaluations - item.cell.passed,
    0
  );
  const nones = group.cells.reduce((sum, item) => sum + item.cell.nones, 0);

  const title =
    axis === "intent" && group.label.startsWith(`${group.key} - `)
      ? group.label.slice(group.key.length + 3)
      : group.label;

  return (
    <Stack
      gap="density-lg"
      role="tooltip"
      aria-label={`${axis === "technique" ? "Technique" : "Intent"} preview`}
    >
      <Stack gap="density-xs">
        <Flex align="center" gap="density-sm">
          <Text kind="label/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
            {axis === "technique" ? "Technique" : "Intent"}
          </Text>
          {axis === "intent" && (
            <Badge color="gray" kind="outline">
              {group.key}
            </Badge>
          )}
        </Flex>
        {(axis === "technique" || title !== group.key) && <Text kind="body/bold/md">{title}</Text>}
        {group.description && (
          <Text
            kind="body/regular/sm"
            style={{
              color: "var(--text-color-secondary)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {group.description}
          </Text>
        )}
      </Stack>
      <Divider />
      <Stack gap="density-sm" role="group" aria-label="Weakest pairing">
        <Text kind="label/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
          Weakest pairing
        </Text>
        {worst && <Text kind="body/bold/md">{worst.otherLabel}</Text>}
        <Flex align="center" justify="between" gap="density-md">
          <Stack gap="density-xxs">
            <Text kind="title/md">{formatRate(group.score)}</Text>
            <Text kind="label/regular/sm">Pass rate</Text>
          </Stack>
          <Stack gap="density-xs" align="end">
            <Badge color={DEFCON_BADGE_COLORS[level]} kind="solid">
              DC-{level}
            </Badge>
            <Text kind="label/regular/sm">{DEFCON_LABELS[level]}</Text>
          </Stack>
        </Flex>
        {tied > 0 && (
          <Text kind="body/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
            {tied} other {tied === 1 ? "pairing" : "pairings"} at this pass rate.
          </Text>
        )}
      </Stack>
      <Divider />
      <Stack gap="density-sm" role="group" aria-label="Across tested pairings">
        <Text kind="label/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
          Across tested pairings
        </Text>
        <Flex align="start" justify="between" gap="density-md">
          <Text kind="body/regular/sm">
            {axis === "technique" ? "Intents" : "Techniques"} evaluated
          </Text>
          <Text kind="body/bold/sm" style={{ whiteSpace: "nowrap" }}>
            {group.cells.length} of {total}
          </Text>
        </Flex>
        <Flex align="start" justify="between" gap="density-md">
          <Text kind="body/regular/sm">Failed evaluations</Text>
          <Text kind="body/bold/sm" style={{ whiteSpace: "nowrap" }}>
            {failed.toLocaleString()} of {group.nEvaluations.toLocaleString()}
          </Text>
        </Flex>
        {nones > 0 && (
          <Text kind="body/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
            {nones.toLocaleString()} undetermined (excluded from pass rate)
          </Text>
        )}
      </Stack>
      <Text kind="body/regular/sm" style={{ color: "var(--text-color-secondary)" }}>
        Click {axis === "technique" ? "row" : "column"} to inspect details.
      </Text>
    </Stack>
  );
};
