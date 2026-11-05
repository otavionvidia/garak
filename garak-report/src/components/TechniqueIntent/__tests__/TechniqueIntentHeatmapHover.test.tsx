/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { view, dispatch, chart } from "./heatmapFixtures";
import TestHeatmap from "./HeatmapHarness";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
describe("heatmap axis hover", () => {
  it.each([
    ["xAxis", "i2"],
    ["yAxis", "t2"],
  ])("highlights %s through ECharts-owned graphics", (componentType, value) => {
    chart.setOption.mockClear();
    render(<TestHeatmap view={view} />);
    dispatch("click", { componentType: "yAxis", value: "t1" });
    dispatch("mouseover", { componentType, value });
    const graphic =
      chart.setOption.mock.calls[chart.setOption.mock.calls.length - 1][0].graphic.elements[0];
    expect(graphic.id).toBe("technique-intent-hover");
    expect(graphic.silent, "hover cannot intercept activation").toBe(true);
    expect(graphic.z, "hover stays below persistent selection").toBe(10);
    expect(graphic.shape.width).toBe(componentType === "xAxis" ? 452 : 904);
    expect(graphic.shape.height).toBe(componentType === "yAxis" ? 44 : 88);
    dispatch("mouseout", {});
    expect(chart.setOption).toHaveBeenLastCalledWith({
      graphic: { elements: [{ id: "technique-intent-hover", ignore: true }] },
    });
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
      "hover does not clear the selected axis"
    ).toBeVisible();
  });
});
