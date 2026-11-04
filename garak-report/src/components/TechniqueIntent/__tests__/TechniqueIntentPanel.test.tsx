/**
 * @file TechniqueIntentPanel.test.tsx
 * @description Integrates the heatmap, inline details, risk focus and selection.
 *
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { setPlatformAPI, type ECElementEvent } from "echarts";
import TechniqueIntentPanel from "../TechniqueIntentPanel";
import type { TechniqueIntentMatrix } from "../../../types/ReportEntry";

setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) });
let click: (event: Partial<ECElementEvent>) => void;
let option: {
  graphic: { elements: { ignore: boolean; shape: { width: number; height: number } }[] };
  xAxis: { data: string[] };
  yAxis: { data: string[] };
  series: {
    type: string;
    data: { rowKey: string; colKey: string; itemStyle: { opacity: number; borderWidth: number } }[];
  }[];
};
vi.mock("echarts-for-react", () => ({
  default: ({
    onEvents,
    option: next,
  }: {
    onEvents: { click: typeof click };
    option: typeof option;
  }) => {
    if (next.series[0].type === "heatmap") {
      click = onEvents.click;
      option = next;
    }
    return <div data-testid="chart" />;
  },
}));

const score = (s: number) => ({
  score: s,
  passed: s * 100,
  total_evaluated: 100,
  nones: 0,
  n_attempts: 100,
  n_detectors: 1,
});
const matrix: TechniqueIntentMatrix = {
  t1: { _summary: { name: "Zulu", n_intents: 2, n_detectors: 1 }, i1: score(0), i2: score(1) },
  t2: { _summary: { name: "Alpha", n_intents: 1, n_detectors: 1 }, i1: score(1) },
};

describe("TechniqueIntentPanel", () => {
  it("shows an empty state for reports without taxonomy data", () => {
    render(<TechniqueIntentPanel />);
    expect(
      screen.getByText("No technique/intent data in this report"),
      "older reports retain their empty state"
    ).toBeVisible();
  });

  it("uses a single heatmap and inline details without duplicate taxonomy lists", () => {
    render(<TechniqueIntentPanel techniqueIntent={matrix} />);
    expect(
      screen.getByRole("region", { name: "Technique by intent pass rates" }),
      "the matrix is the main view"
    ).toBeVisible();
    expect(screen.queryByText("By technique"), "the technique list is removed").toBeNull();
    expect(screen.queryByText("By intent"), "the intent list is removed").toBeNull();
    act(() => click({ componentType: "yAxis", value: "t1" }));
    expect(
      screen.getByText("Pass rate by intent. Click a bar for the pass/fail breakdown."),
      "row breakdown remains available"
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Open in list" }),
      "there is no redundant navigation action"
    ).toBeNull();
  });

  it("opens pairing details directly after the matrix without a recommendations banner", () => {
    render(<TechniqueIntentPanel techniqueIntent={matrix} />);
    expect(
      screen.queryByText("Notable pairings"),
      "no heuristic recommendations interrupt exploration"
    ).toBeNull();
    const pairing = {
      componentType: "series",
      data: { rowKey: "t1", colKey: "i1", value: [0, 0, 0] },
    };
    act(() => click(pairing));
    expect(screen.getByText("Passed"), "pairing counts still open inline").toBeVisible();
    expect(option.graphic.elements[0].ignore, "the selected cell remains outlined").toBe(false);
    act(() => click(pairing));
    expect(
      screen.queryByRole("button", { name: "Clear selection" }),
      "direct cell selection still toggles off"
    ).toBeNull();
  });

  it("focuses risk levels while retaining the default risk-first order", () => {
    render(<TechniqueIntentPanel techniqueIntent={matrix} />);
    expect(
      screen.queryByRole("radio", { name: "Alphabetical" }),
      "heatmap sorting has been removed"
    ).toBeNull();
    expect(option.yAxis.data, "the matrix retains its default risk-first order").toEqual([
      "t1",
      "t2",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /^DC-1 ·/ }));
    expect(
      screen.getAllByRole("button", { name: /^DC-1 ·/ }),
      "one interactive legend replaces duplicate risk controls"
    ).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /^DC-1 ·/ }),
      "legend exposes its focus state"
    ).toHaveAttribute("aria-pressed", "false");
    const dimmed = option.series[0].data.find(
      point => point.rowKey === "t1" && point.colKey === "i1"
    )!;
    expect(
      dimmed.itemStyle.opacity,
      "risk focus dims rather than inventing missing data"
    ).toBeLessThan(1);
    expect(
      screen.getByText(/Summaries include all evaluations/),
      "the scope of summaries stays explicit"
    ).toBeVisible();
    act(() =>
      click({ componentType: "series", data: { rowKey: "t1", colKey: "i1", value: [0, 0, 0] } })
    );
    expect(
      option.series[0].data.find(point => point.rowKey === "t1" && point.colKey === "i1")!.itemStyle
        .opacity,
      "selection remains visible while focused"
    ).toBe(1);
    expect(screen.getByText("Passed"), "a dimmed pairing still has its real details").toBeVisible();
  });
});
