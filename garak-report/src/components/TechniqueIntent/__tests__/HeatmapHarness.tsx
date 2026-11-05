/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { useState } from "react";
import Heatmap from "../TechniqueIntentHeatmap";
import type { MatrixView } from "../../../types/TechniqueIntent";
import type { HeatmapSelection } from "../../../types/TechniqueIntentHeatmap";
const TestHeatmap = ({
  view,
  onSelect = () => {},
}: {
  view: MatrixView;
  onSelect?: (next: HeatmapSelection | null) => void;
}) => {
  const [selection, setSelection] = useState<HeatmapSelection | null>(null);
  return (
    <Heatmap
      view={view}
      selection={selection}
      onToggleDefcon={() => {}}
      onSelectionChange={next => {
        setSelection(next);
        onSelect(next);
      }}
    />
  );
};

export default TestHeatmap;
