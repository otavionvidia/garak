import { setPlatformAPI } from "echarts";
import { vi } from "vitest";
import { buildMatrixView } from "../../utils/techniqueIntentRollup";
setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) });
export const colours = ["", "#961515", "#df6500", "#008af9", "#327100", "#139a86"];
vi.mock("../useSeverityColor", () => ({
  default: () => ({
    getDefconColor: (level: number) =>
      ["", "#961515", "#df6500", "#008af9", "#327100", "#139a86"][level],
  }),
}));
export const counts = (score: number | null) => ({
  score,
  passed: Math.round((score ?? 0) * 100),
  total_evaluated: score == null ? 0 : 100,
  nones: 2,
  n_detectors: 1,
});
export const view = buildMatrixView({
  "demon:one": { i1: counts(0), i2: counts(1) },
  "demon:two": { i1: counts(0.5), i2: counts(null) },
});
