/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

/** Compose the heatmap's controls, accessible chart and inline result details. */
import { useCallback } from "react";
import { Stack, StatusMessage } from "@kui/react";
import type { MatrixView } from "../../utils/techniqueIntentRollup";
import type { HeatmapSelection } from "../../types/TechniqueIntentHeatmap";
import { sameHeatmapSelection } from "../../utils/techniqueIntentHeatmapSelection";
import { useTechniqueIntentHeatmapOptions } from "../../hooks/useTechniqueIntentHeatmapOptions";
import { useTechniqueIntentHeatmapNavigation } from "../../hooks/useTechniqueIntentHeatmapNavigation";
import { useTechniqueIntentHeatmapKeyboard } from "../../hooks/useTechniqueIntentHeatmapKeyboard";
import Header from "./TechniqueIntentHeatmapHeader";
import Legend from "./TechniqueIntentHeatmapLegend";
import Canvas from "./TechniqueIntentHeatmapCanvas";
import Detail from "./TechniqueIntentHeatmapDetail";
interface Props {
  view: MatrixView;
  isDark?: boolean;
  selection: HeatmapSelection | null;
  onSelectionChange: (selection: HeatmapSelection | null) => void;
}
const TechniqueIntentHeatmap = ({ view, isDark, selection, onSelectionChange }: Props) => {
  const navigation = useTechniqueIntentHeatmapNavigation(view);
  const select = useCallback(
    (next: HeatmapSelection | null) =>
      onSelectionChange(sameHeatmapSelection(selection, next) ? null : next),
    [selection, onSelectionChange]
  );
  const keyboard = useTechniqueIntentHeatmapKeyboard(view, select, navigation.showColumn);
  const model = useTechniqueIntentHeatmapOptions(view, isDark, {
    selection,
    focus: keyboard.focus,
    width: navigation.width,
    ...navigation.matrixWindow,
  });
  if (!view.rows.length || !view.cols.length)
    return <StatusMessage size="small" slotHeading="No evaluated technique/intent pairings" />;
  return (
    <Stack gap="density-md">
      <Header
        techniques={view.rows.length}
        total={view.cols.length}
        count={model.colCount}
        first={model.firstCol}
        onZoom={direction => navigation.zoom(direction, model.colCount)}
        onReset={navigation.reset}
      />
      <Legend />
      <Canvas
        view={view}
        model={model}
        navigation={navigation}
        keyboard={keyboard}
        onSelect={select}
      />
      {selection && (
        <Detail
          view={view}
          groups={model.groups}
          selection={selection}
          isDark={isDark}
          onClear={() => onSelectionChange(null)}
        />
      )}
    </Stack>
  );
};
export default TechniqueIntentHeatmap;
