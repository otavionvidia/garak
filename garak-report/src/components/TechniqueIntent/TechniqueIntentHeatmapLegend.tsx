/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

/** One KUI legend also controls risk focus without removing evaluated cells. */
import { Button, Flex, Text, Tooltip } from "@kui/react";
import { DEFCON_LEVELS, DEFCON_LABELS, DEFCON_PCT_RANGE } from "../../constants";
import useSeverityColor from "../../hooks/useSeverityColor";
const TechniqueIntentHeatmapLegend = ({
  selectedDefcons,
  onToggleDefcon,
}: {
  selectedDefcons?: number[];
  onToggleDefcon: (level: number) => void;
}) => {
  const { getDefconColor } = useSeverityColor();
  return (
    <>
      <Flex
        align="center"
        gap="density-xs"
        wrap="wrap"
        role="group"
        aria-label="Pass rate legend and risk focus"
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
                <span
                  aria-hidden="true"
                  style={{
                    backgroundColor: getDefconColor(level),
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    opacity: active ? 1 : 0.3,
                  }}
                />
                DC-{level}
              </Button>
            </Tooltip>
          );
        })}
        <Text kind="label/regular/sm">— Not evaluated</Text>
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
