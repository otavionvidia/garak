/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { act } from "@testing-library/react";
import { vi } from "vitest";
import { setPlatformAPI, type ECharts, type ECElementEvent } from "echarts";
import { buildMatrixView } from "../../../utils/techniqueIntentRollup";
import type { useTechniqueIntentHeatmapOptions } from "../../../hooks/useTechniqueIntentHeatmapOptions";
import type { TechniqueIntentMatrix } from "../../../types/ReportEntry";
setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) });
export const chart = {
  setOption: vi.fn(),
  getOption: () => ({ dataZoom: [{ startValue: 0, endValue: 0 }] }),
  getDom: () => document.documentElement,
};
export let option: ReturnType<typeof useTechniqueIntentHeatmapOptions>["option"];
export let events: Record<string, (event: Partial<ECElementEvent>, instance: ECharts) => void>;
vi.mock("echarts-for-react", () => ({
  default: ({ onEvents, option: next }: { onEvents: typeof events; option: typeof option }) => {
    if (next.series[0].type === "heatmap") {
      events = onEvents;
      option = next;
    }
    return <div data-testid="heatmap-chart" />;
  },
}));
export const evaluated = { score: 0, passed: 0, total_evaluated: 10, nones: 0, n_detectors: 1 };
export const view = buildMatrixView({
  t1: { _summary: { name: "Same label", n_intents: 1, n_detectors: 1 }, i1: evaluated },
  t2: { _summary: { name: "Same label", n_intents: 1, n_detectors: 1 }, i2: evaluated },
});
export const largeView = (columns: number) =>
  buildMatrixView({
    t1: Object.fromEntries(Array.from({ length: columns }, (_, i) => [`i${i}`, evaluated])),
  });
export const dispatch = (name: string, event: Partial<ECElementEvent>) =>
  act(() => events[name](event, chart as unknown as ECharts));

const score = (s: number) => ({
  score: s,
  passed: s * 100,
  total_evaluated: 100,
  nones: 0,
  n_attempts: 100,
  n_detectors: 1,
});
export const focusMatrix: TechniqueIntentMatrix = {
  t1: { _summary: { name: "Zulu", n_intents: 2, n_detectors: 1 }, i1: score(0), i2: score(1) },
  t2: { _summary: { name: "Alpha", n_intents: 1, n_detectors: 1 }, i1: score(1) },
};
