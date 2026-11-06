/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

/** Continuous pass-rate scale with separate DEFCON focus controls. */
import { Button, ButtonGroup, Flex, Stack, Text, Tooltip } from "@kui/react";
import { CSS_COLOR_VARS, DEFCON_LEVELS, DEFCON_LABELS, DEFCON_PCT_RANGE } from "../../constants";
const gradient = `linear-gradient(to right, ${DEFCON_LEVELS.map(
  level => `var(${CSS_COLOR_VARS.riskRamp[level]})`
).join(", ")})`;
const TechniqueIntentHeatmapLegend = ({
  selectedDefcons,
  onToggleDefcon,
}: {
  selectedDefcons?: number[];
  onToggleDefcon: (level: number) => void;
}) => {
  return (
    <>
      <Flex
        align="center"
        gap="density-lg"
        wrap="wrap"
        role="group"
        aria-label="Pass rate legend and risk focus"
      >
        <Flex align="center" gap="density-sm">
          <Text kind="label/regular/sm">Pass rate</Text>
          <Stack gap="density-xxs" style={{ width: 200 }}>
            <span aria-hidden="true" style={{ height: 8, borderRadius: 2, background: gradient }} />
            <Flex justify="between">
              <Text kind="label/regular/sm">0%</Text>
              <Text kind="label/regular/sm">50%</Text>
              <Text kind="label/regular/sm">100%</Text>
            </Flex>
          </Stack>
        </Flex>
        <Text kind="label/regular/sm">— Not evaluated</Text>
        <Flex align="center" gap="density-sm" wrap="wrap">
          <Text kind="label/regular/sm">Focus by DEFCON</Text>
          <ButtonGroup
            kind="secondary"
            color="neutral"
            size="small"
            role="group"
            aria-label="Focus by DEFCON"
          >
            {DEFCON_LEVELS.map(level => {
              const active = selectedDefcons?.includes(level) ?? true;
              return (
                <Tooltip
                  key={level}
                  slotContent={`DC-${level} · ${DEFCON_LABELS[level]} · ${DEFCON_PCT_RANGE[level]}. Select to ${active ? "dim" : "restore"} this risk level.`}
                >
                  <Button
                    kind={active ? "secondary" : "tertiary"}
                    color="neutral"
                    size="small"
                    aria-label={`DC-${level} · ${DEFCON_LABELS[level]} · ${DEFCON_PCT_RANGE[level]}`}
                    aria-pressed={active}
                    onClick={() => onToggleDefcon(level)}
                  >
                    DC-{level}
                  </Button>
                </Tooltip>
              );
            })}
          </ButtonGroup>
        </Flex>
      </Flex>
      {selectedDefcons && selectedDefcons.length < DEFCON_LEVELS.length && (
        <Text kind="body/regular/sm">
          Other risk levels are dimmed. Summaries include all evaluations; selected results stay
          visible.
        </Text>
      )}
    </>
  );
};
export default TechniqueIntentHeatmapLegend;
