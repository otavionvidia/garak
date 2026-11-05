/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { colours, counts, view } from "./heatmapFixtures";
import { renderHook } from "@testing-library/react";
import { init, setPlatformAPI } from "echarts";
import { describe, it, expect } from "vitest";
import { useTechniqueIntentHeatmapOptions } from "../useTechniqueIntentHeatmapOptions";
import { buildMatrixView } from "../../utils/techniqueIntentRollup";

describe("useTechniqueIntentHeatmapOptions", () => {
  it("keeps an untested pairing distinct from a measured zero pass rate", () => {
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(view));
    const cells = result.current.option.series[0].data;
    expect(cells, "the full two by two grid is present").toHaveLength(4);
    expect(cells[0].label.formatter, "zero is a measured failure rate").toBe("0%");
    expect(cells[3].label.formatter, "missing results remain explicit").toBe("—");
    expect(cells[3].itemStyle.color, "untested cells have no risk colour").toBe("transparent");
  });

  it("maps boundary scores to the existing Garak severity palette", () => {
    const boundaryView = buildMatrixView({
      t: Object.fromEntries([0, 0.05, 0.4, 0.8, 0.99].map((s, i) => [`i${i}`, counts(s)])),
    });
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(boundaryView));
    expect(
      result.current.option.series[0].data.map(c => c.itemStyle.color),
      "the heatmap uses the same DEFCON boundaries and colours as bars"
    ).toEqual(colours.slice(1));
  });

  it("retains raw axis keys while formatting readable labels", () => {
    const labelled = buildMatrixView({ t: { i1: { ...counts(0), name: "Intent label" } } });
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(labelled));
    expect(result.current.option.xAxis.data, "events identify the intent by code").toEqual(["i1"]);
    expect(
      result.current.option.xAxis.axisLabel.formatter("i1"),
      "axis displays code and name"
    ).toBe("i1\nIntent label");
  });

  it("guides both hovered axes without changing the tooltip to an axis aggregate", () => {
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(view));
    expect(result.current.option.tooltip.trigger, "hover describes a single pairing").toBe("item");
    expect(
      result.current.option.series[0].emphasis.disabled,
      "hover bands remain distinct from selection outlines"
    ).toBe(true);
    for (const axis of [result.current.option.xAxis, result.current.option.yAxis]) {
      expect(axis.axisPointer.type, "subtle bands identify the intersecting row and column").toBe(
        "shadow"
      );
      expect(
        axis.axisPointer.triggerEmphasis,
        "hover guides do not override persistent selection"
      ).toBe(false);
    }
  });

  it.each([false, true])("renders real heatmap tiles, including N/A, in dark=%s", isDark => {
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(view, isDark));
    setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) });
    const chart = init(null, undefined, {
      renderer: "svg",
      ssr: true,
      width: 1200,
      height: result.current.height,
    });
    try {
      chart.setOption(result.current.option);
      const svg = chart.renderToSVGString();
      expect(svg, "ECharts renders an explicit untested tile").toContain("—");
      expect(svg, "zero pass rates remain visible").toContain("0%");
      expect(svg, "known failures use the shared critical colour").toContain(colours[1]);
    } finally {
      chart.dispose();
    }
  });
});
