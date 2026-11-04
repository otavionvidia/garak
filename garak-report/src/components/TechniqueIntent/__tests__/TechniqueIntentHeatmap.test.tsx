/**
 * @file TechniqueIntentHeatmap.test.tsx
 * @description Tests heatmap selections against stable taxonomy keys.
 */

import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState, type Ref } from "react";
import { setPlatformAPI, type ECElementEvent } from "echarts";
import Heatmap from "../TechniqueIntentHeatmap";
import { buildMatrixView, type MatrixView } from "../../../utils/techniqueIntentRollup";
import type {
  HeatmapCell,
  HeatmapSelection,
} from "../../../hooks/useTechniqueIntentHeatmapOptions";

setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) });

let click: (params: Partial<ECElementEvent>) => void;
let mouseover: typeof click;
let mouseout: () => void;
const { add, remove } = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn() }));
vi.mock("echarts-for-react", async () => {
  const { useImperativeHandle } = await import("react");
  return {
    default: function MockECharts({
      onEvents,
      option,
      ref,
    }: {
      onEvents: { click: typeof click; mouseover: typeof click; mouseout: () => void };
      ref: Ref<{
        getEchartsInstance: () => { getZr: () => { add: typeof add; remove: typeof remove } };
      }>;
      option: { series: { type: string }[] };
    }) {
      useImperativeHandle(ref, () => ({
        getEchartsInstance: () => ({ getZr: () => ({ add, remove }) }),
      }));
      if (option.series[0].type === "heatmap") {
        click = onEvents.click;
        mouseover = onEvents.mouseover;
        mouseout = onEvents.mouseout;
      }
      return <div data-testid="heatmap-chart" />;
    },
  };
});

const evaluated = { score: 0, passed: 0, total_evaluated: 10, nones: 0, n_detectors: 1 };
const view = buildMatrixView({
  t1: { _summary: { name: "Same label", n_intents: 1, n_detectors: 1 }, i1: evaluated },
  t2: { _summary: { name: "Same label", n_intents: 1, n_detectors: 1 }, i2: evaluated },
});

const TechniqueIntentHeatmap = ({
  view,
  onSelect,
}: {
  view: MatrixView;
  onSelect: (next: HeatmapSelection | null) => void;
}) => {
  const [selection, setSelection] = useState<HeatmapSelection | null>(null);
  return (
    <Heatmap
      onToggleDefcon={() => {}}
      view={view}
      selection={selection}
      onSelectionChange={next => {
        setSelection(next);
        onSelect(next);
      }}
    />
  );
};

describe("TechniqueIntentHeatmap", () => {
  it.each([
    ["xAxis", "i2", "intent"],
    ["yAxis", "t2", "technique"],
  ])("selects %s labels by taxonomy key", (componentType, value, axis) => {
    const onSelect = vi.fn();
    render(<TechniqueIntentHeatmap view={view} onSelect={onSelect} />);
    act(() => click({ componentType, value }));
    expect(onSelect, "duplicate display names do not change the selected key").toHaveBeenCalledWith(
      {
        axis,
        key: value,
      }
    );
  });

  it.each([
    ["xAxis", "i2"],
    ["yAxis", "t2"],
  ])("highlights the whole %s on label hover and restores it on leave", (componentType, value) => {
    add.mockClear();
    remove.mockClear();
    render(<TechniqueIntentHeatmap view={view} onSelect={vi.fn()} />);
    act(() =>
      click({ componentType: "series", data: { rowKey: "t1", colKey: "i1", value: [0, 0, 0] } })
    );
    act(() => mouseover({ componentType, value }));
    expect(add, "a temporary band marks the hovered axis").toHaveBeenCalledOnce();
    const band = add.mock.calls[0][0];
    expect(band.silent, "the band does not intercept tooltip or click events").toBe(true);
    expect(band.style.stroke, "hover does not use the selection outline").toBeNull();
    expect(band.shape.width, "column hover spans only one column").toBe(
      componentType === "xAxis" ? 452 : 904
    );
    expect(band.shape.height, "row hover spans only one row").toBe(
      componentType === "yAxis" ? 44 : 88
    );
    expect(
      screen.queryByRole("button", { name: "Clear selection" }),
      "hover retains the selected cell"
    ).toBeVisible();
    act(() => mouseout());
    expect(remove, "leaving removes only the temporary grey band").toHaveBeenLastCalledWith(band);
    expect(screen.getByText("Passed"), "persistent details remain after hover ends").toBeVisible();
  });

  it("opens a measured zero-pass pairing", () => {
    const onSelect = vi.fn();
    render(<TechniqueIntentHeatmap view={view} onSelect={onSelect} />);
    const point: HeatmapCell = { rowKey: "t1", colKey: "i1", value: [0, 0, 0] };
    act(() => click({ componentType: "series", data: point }));
    expect(screen.getByText("Passed"), "counts are shown beneath the matrix").toBeVisible();
    expect(onSelect, "a zero score still has details").toHaveBeenCalledWith({
      axis: "cell",
      technique: "t1",
      intent: "i1",
    });
  });

  it.each([
    { componentType: "series", data: { rowKey: "t1", colKey: "i1", value: [0, 0, 0] } },
    { componentType: "yAxis", value: "t1" },
    { componentType: "xAxis", value: "i1" },
  ])("toggles the selected $componentType off on a second click", event => {
    render(<TechniqueIntentHeatmap view={view} onSelect={vi.fn()} />);
    act(() => click(event));
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
      "the first click selects"
    ).toBeVisible();
    act(() => click(event));
    expect(
      screen.queryByRole("button", { name: "Clear selection" }),
      "the second click dismisses details"
    ).toBeNull();
    expect(
      screen.getByRole("region"),
      "clearing a selection keeps the matrix visible"
    ).toBeVisible();
  });

  it("switches between distinct keys that share a label", () => {
    const onSelect = vi.fn();
    render(<TechniqueIntentHeatmap view={view} onSelect={onSelect} />);
    act(() => click({ componentType: "yAxis", value: "t1" }));
    act(() => click({ componentType: "yAxis", value: "t2" }));
    expect(onSelect, "a different key selects rather than toggling off").toHaveBeenCalledWith({
      axis: "technique",
      key: "t2",
    });
    act(() => click({ componentType: "xAxis", value: "i2" }));
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
      "switching axes keeps a selection"
    ).toBeVisible();
  });

  it.each([
    [
      "cell",
      {
        componentType: "series",
        data: { rowKey: "t1", colKey: "i1", value: [0, 0, 0] as number[] },
      },
      false,
    ],
    ["row", { componentType: "yAxis", value: "t1" }, false],
    ["column", { componentType: "xAxis", value: "i1" }, true],
  ] as const)(
    "scrolls to %s details on selection, respecting reduced motion",
    (_kind, event, reducedMotion) => {
      const scrollDescriptor = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "scrollIntoView"
      );
      const motionDescriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
      const scrollIntoView = vi.fn();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: scrollIntoView,
      });
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({ matches: reducedMotion })),
      });
      try {
        render(<TechniqueIntentHeatmap view={view} onSelect={vi.fn()} />);
        expect(
          scrollIntoView,
          "rendering the matrix does not move the page"
        ).not.toHaveBeenCalled();
        act(() => click(event));
        expect(
          scrollIntoView,
          "selecting an item reveals its detail once"
        ).toHaveBeenCalledExactlyOnceWith({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
        const target = scrollIntoView.mock.contexts[0] as HTMLElement;
        expect(
          within(target).getByRole("button", { name: "Clear selection" }),
          "scroll targets the detail section rather than the chart"
        ).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
        expect(
          scrollIntoView,
          "zooming does not trigger another detail jump"
        ).toHaveBeenCalledTimes(1);
        act(() => click(event));
        expect(scrollIntoView, "deselecting does not request a scroll").toHaveBeenCalledTimes(1);
      } finally {
        if (scrollDescriptor)
          Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
        else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
        if (motionDescriptor) Object.defineProperty(window, "matchMedia", motionDescriptor);
        else Reflect.deleteProperty(window, "matchMedia");
      }
    }
  );

  it("ignores untested pairs and unrelated chart events", () => {
    const onSelect = vi.fn();
    render(<TechniqueIntentHeatmap view={view} onSelect={onSelect} />);
    click({ componentType: "series", data: { rowKey: "t1", colKey: "i2", value: [1, 0, -1] } });
    click({ componentType: "xAxis", value: "missing" });
    click({ componentType: "legend" });
    expect(onSelect, "missing results must not open another pairing").not.toHaveBeenCalled();
  });

  it("offers keyboard zoom controls and explains the score direction", () => {
    render(<TechniqueIntentHeatmap view={view} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Zoom out" }),
      "zoom is available without canvas interaction"
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Lower pass rates mean more failures/),
      "score meaning is visible"
    ).toBeVisible();
  });

  it("clears an inline selection without losing the matrix", () => {
    render(<TechniqueIntentHeatmap view={view} onSelect={vi.fn()} />);
    act(() => click({ componentType: "yAxis", value: "t1" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(
      screen.queryByRole("button", { name: "Clear selection" }),
      "detail is dismissed"
    ).toBeNull();
    expect(screen.getByRole("region"), "the matrix stays mounted").toBeVisible();
  });

  it("supports overview zoom while keeping every technique visible", () => {
    const large = buildMatrixView(
      Object.fromEntries(
        Array.from({ length: 20 }, (_, row) => [
          `t${row}`,
          Object.fromEntries(Array.from({ length: 20 }, (_, col) => [`i${col}`, evaluated])),
        ])
      )
    );
    render(<TechniqueIntentHeatmap view={large} onSelect={vi.fn()} />);
    expect(
      screen.getByText("20 techniques · 20 intents"),
      "starts with the whole matrix"
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Zoom out" }),
      "overview is the outer zoom limit"
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset zoom" }),
      "overview needs no reset"
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(
      screen.getByText(/20 techniques · Intents 1–10 of 20/),
      "zoom in restores room per intent"
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(
      screen.getByText("20 techniques · 20 intents"),
      "zoom out restores the overview"
    ).toBeVisible();
    for (let step = 0; step < 5; step++)
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(
      screen.getByRole("button", { name: "Zoom in" }),
      "one intent is the inner zoom limit"
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(
      screen.getByText("20 techniques · 20 intents"),
      "reset restores all intents in one action"
    ).toBeVisible();
  });

  it("explains when the matrix has no evaluated pairs", () => {
    render(<TechniqueIntentHeatmap view={buildMatrixView({})} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("heatmap-chart"), "an empty grid is not rendered").toBeNull();
    expect(screen.getByText("No evaluated technique/intent pairings")).toBeVisible();
  });
});
