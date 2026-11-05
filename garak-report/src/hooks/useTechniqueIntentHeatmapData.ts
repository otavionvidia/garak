/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

/** Keep report summaries independent from selection, zoom and risk focus. */
import { useMemo } from "react";
import { DEFCON_LEVELS, THEME_COLORS, scoreToDefcon } from "../constants";
import { formatRate } from "../utils/formatPercentage";
import { buildAxisGroups } from "../utils/techniqueIntentGroups";
import { contrastText } from "../utils/techniqueIntentHeatmapGraphics";
import type { MatrixView } from "../types/TechniqueIntent";
import type { HeatmapSelection } from "../types/TechniqueIntentHeatmap";
import type { HeatmapLayout } from "../utils/techniqueIntentHeatmapLayout";
import useSeverityColor from "./useSeverityColor";

function useTechniqueIntentHeatmapPalette(isDark?: boolean) {
  const { getDefconColor } = useSeverityColor();
  return useMemo(() => {
    const theme = getComputedStyle(document.documentElement);
    const text = isDark ? THEME_COLORS.text.dark : THEME_COLORS.text.light;
    const border = isDark ? THEME_COLORS.chart.splitLine.dark : THEME_COLORS.chart.splitLine.light;
    const token = (name: string, fallback: string) =>
      theme.getPropertyValue(name).trim() || fallback;
    return {
      text,
      border,
      colours: DEFCON_LEVELS.map(getDefconColor),
      alternate: token(isDark ? "--color-gray-300" : "--color-gray-600", text),
      quietBorder: token(
        isDark ? "--color-translucent-white-100" : "--color-translucent-black-100",
        border
      ),
      hover: token("--background-color-interaction-hover", isDark ? "#ffffff1a" : "#0000000d"),
    };
  }, [isDark, getDefconColor]);
}
export type HeatmapPalette = ReturnType<typeof useTechniqueIntentHeatmapPalette>;

export function useTechniqueIntentHeatmapData(
  view: MatrixView,
  layout: HeatmapLayout,
  isDark?: boolean,
  selection?: HeatmapSelection | null,
  selectedDefcons?: number[]
) {
  const palette = useTechniqueIntentHeatmapPalette(isDark);
  const groups = useMemo(
    () => ({
      technique: new Map(buildAxisGroups(view, "technique").map(group => [group.key, group])),
      intent: new Map(buildAxisGroups(view, "intent").map(group => [group.key, group])),
    }),
    [view]
  );
  const data = useMemo(
    () =>
      view.rows.flatMap((rowKey, y) =>
        view.cols.slice(layout.firstCol, layout.firstCol + layout.colCount).map((colKey, index) => {
          const cell = view.cell(rowKey, colKey);
          const selected =
            selection?.axis === "cell"
              ? selection.technique === rowKey && selection.intent === colKey
              : selection?.axis === "technique"
                ? selection.key === rowKey
                : selection?.axis === "intent" && selection.key === colKey;
          const colour = cell ? palette.colours[scoreToDefcon(cell.score) - 1] : "transparent";
          return {
            value: [layout.firstCol + index, y, cell?.score ?? -1] as [number, number, number],
            rowKey,
            colKey,
            itemStyle: {
              color: colour,
              opacity:
                selected ||
                !cell ||
                !selectedDefcons ||
                selectedDefcons.includes(scoreToDefcon(cell.score))
                  ? 1
                  : 0.15,
              borderColor: cell ? palette.border : palette.quietBorder,
              borderWidth: 0.5,
            },
            label: {
              show: layout.columnWidth >= 52,
              formatter: cell ? formatRate(cell.score) : "—",
              color: cell ? contrastText(colour) : palette.text,
              opacity: cell ? 1 : 0.35,
              fontSize: 12,
              fontWeight: selected ? "bold" : "normal",
            },
          };
        })
      ),
    [
      view,
      layout.firstCol,
      layout.colCount,
      layout.columnWidth,
      palette,
      selection,
      selectedDefcons,
    ]
  );
  return { data, groups, palette };
}
export type HeatmapGroups = ReturnType<typeof useTechniqueIntentHeatmapData>["groups"];
