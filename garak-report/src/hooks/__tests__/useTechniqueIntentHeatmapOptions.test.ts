/**
 * @file useTechniqueIntentHeatmapOptions.test.ts
 * @description Checks heatmap rendering, score semantics and report-supplied labels.
 */

import { renderHook } from "@testing-library/react";
import { init, setPlatformAPI } from "echarts";
import { describe, it, expect, vi } from "vitest";
import { useTechniqueIntentHeatmapOptions } from "../useTechniqueIntentHeatmapOptions";
import { buildMatrixView } from "../../utils/techniqueIntentRollup";
import type { TechniqueIntentMatrix } from "../../types/ReportEntry";

setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) });

const colours = ["", "#961515", "#df6500", "#008af9", "#327100", "#139a86"];
vi.mock("../useSeverityColor", () => ({
  default: () => ({
    getDefconColor: (level: number) =>
      ["", "#961515", "#df6500", "#008af9", "#327100", "#139a86"][level],
  }),
}));

const counts = (score: number | null) => ({
  score,
  passed: Math.round((score ?? 0) * 100),
  total_evaluated: score == null ? 0 : 100,
  nones: 2,
  n_detectors: 1,
});

const matrix: TechniqueIntentMatrix = {
  "demon:one": { i1: counts(0), i2: counts(1) },
  "demon:two": { i1: counts(0.5), i2: counts(null) },
};
const view = buildMatrixView(matrix);

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

  it("escapes taxonomy text in tooltips and reports actual counts", () => {
    const labelled = buildMatrixView(
      {
        t: {
          _summary: {
            name: "<img src=x>",
            description: "<script>bad</script>",
            n_intents: 1,
            n_detectors: 1,
          },
          i1: counts(0.4),
        },
      },
      { i1: { name: "<svg onload=bad>", descr: "<script>bad</script>" } }
    );
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(labelled));
    const html = result.current.option.tooltip.formatter({
      data: result.current.option.series[0].data[0],
    });
    expect(html, "taxonomy values are text rather than executable markup").not.toContain("<img");
    expect(html, "intent names are escaped").toContain("&lt;svg onload=bad&gt;");
    expect(html, "intent descriptions are escaped").toContain("&lt;script&gt;bad&lt;/script&gt;");
    const tooltip = document.createElement("div");
    tooltip.innerHTML = html;
    expect(tooltip.textContent, "counts describe evaluated outputs").toContain(
      "60 failed out of 100 evaluated"
    );
    expect(tooltip.textContent, "undetermined results stay separate").toContain(
      "2 undetermined (excluded from pass rate)"
    );
  });

  it.each(["xAxis", "yAxis"] as const)(
    "formats %s previews by raw taxonomy key across the full axis",
    axis => {
      const { result } = renderHook(() =>
        useTechniqueIntentHeatmapOptions(view, false, { colSpan: 1 })
      );
      const key = axis === "xAxis" ? "i1" : "demon:one";
      const tooltip = document.createElement("div");
      tooltip.innerHTML = result.current.option[axis].tooltip.formatter({ value: key });
      expect(tooltip.textContent, "axis previews disclose the worst-child score").toContain(
        "Weakest pairing"
      );
      expect(tooltip.textContent, "coverage remains independent of the zoom window").toContain(
        `${axis === "xAxis" ? "Techniques" : "Intents"} evaluated2 of 2`
      );
      expect(
        result.current.option[axis].tooltip.formatter({ value: "missing" }),
        "unrecognised keys do not show stale content"
      ).toBe("");
    }
  );

  it("anchors previews beside the cell and keeps them inside the chart", () => {
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(view));
    const position = result.current.option.tooltip.position;
    const dom = document.createElement("div");
    const size = { viewSize: [1200, 600], contentSize: [320, 280] };
    const cell = { x: 300, y: 100, width: 20, height: 24 };
    const first = position([301, 101], {}, dom, cell, size);
    expect(
      position([319, 123], {}, dom, cell, size),
      "movement within a cell does not move the preview"
    ).toEqual(first);
    expect(first, "preview sits to the right with a gap").toEqual([332, 100]);
    expect(
      position([1190, 590], {}, dom, { ...cell, x: 1180, y: 576 }, size),
      "right and bottom edges flip and constrain the preview"
    ).toEqual([848, 320]);
    expect(
      position([100, 400], {}, dom, { ...cell, x: 100, y: 400 }, { ...size, viewSize: [390, 600] }),
      "narrow charts place the preview above the cell"
    ).toEqual([0, 108]);
    expect(
      position([100, 10], {}, dom, { ...cell, x: 100, y: 10 }, { ...size, viewSize: [390, 600] }),
      "top-edge previews fit below the cell"
    ).toEqual([0, 46]);
  });

  it("keeps taller previews visible when the chart starts near the viewport bottom", () => {
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(view));
    const host = document.createElement("div");
    const dom = host.appendChild(document.createElement("div"));
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight - 100,
    } as DOMRect);
    const [, y] = result.current.option.tooltip.position(
      [100, 20],
      {},
      dom,
      { x: 100, y: 20, width: 20, height: 24 },
      { contentSize: [320, 350], viewSize: [1200, 600] }
    );
    expect(y, "previews may extend above the chart to stay on screen").toBeLessThan(0);
    expect(
      y + window.innerHeight - 100 + 350,
      "the preview ends inside the viewport"
    ).toBeLessThanOrEqual(window.innerHeight - 8);
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

  it("shows all techniques with horizontal intent labels", () => {
    const larger = buildMatrixView(
      Object.fromEntries(
        Array.from({ length: 20 }, (_, row) => [
          `t${row}`,
          Object.fromEntries(Array.from({ length: 20 }, (_, col) => [`i${col}`, counts(1)])),
        ])
      )
    );
    const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(larger));
    expect(result.current.rowCount, "every technique remains visible").toBe(20);
    expect(result.current.colCount, "columns retain enough width for labels").toBeLessThanOrEqual(
      8
    );
    expect(result.current.option.xAxis.axisLabel.rotate, "labels read horizontally").toBe(0);
    expect(result.current.option.dataZoom[0].zoomLock, "the intent window can be expanded").toBe(
      false
    );
  });

  it("preserves the navigated window when a selection changes", () => {
    const larger = buildMatrixView(
      Object.fromEntries(
        Array.from({ length: 20 }, (_, row) => [
          `t${row}`,
          Object.fromEntries(Array.from({ length: 20 }, (_, col) => [`i${col}`, counts(1)])),
        ])
      )
    );
    const { result } = renderHook(() =>
      useTechniqueIntentHeatmapOptions(larger, false, {
        colStart: 7,
        selection: { axis: "technique", key: "t1" },
      })
    );
    expect(
      result.current.option.dataZoom.map(zoom => zoom.startValue),
      "selection retains the intent position"
    ).toEqual([7]);
  });

  it.each(["cell", "technique", "intent"] as const)("outlines a persistent %s selection", axis => {
    const selection =
      axis === "cell"
        ? { axis, technique: "demon:one", intent: "i1" }
        : { axis, key: axis === "technique" ? "demon:one" : "i1" };
    const { result } = renderHook(() =>
      useTechniqueIntentHeatmapOptions(view, false, { selection })
    );
    const outline = result.current.option.graphic.elements[0];
    expect(outline.ignore, "the selected axis or pairing has an outline").toBe(false);
    expect(outline.z, "the outline is drawn above tiles and hover bands").toBeGreaterThan(50);
    expect(outline.silent, "the overlay does not intercept clicks or tooltips").toBe(true);
    const { grid } = result.current.option;
    if (axis === "technique") {
      expect(outline.shape.width, "a row uses one continuous full-width outline").toBe(
        1200 - grid.left - grid.right
      );
    } else if (axis === "intent") {
      expect(outline.shape.height, "a column uses one continuous full-height outline").toBe(
        result.current.height - grid.top - grid.bottom
      );
    }
    expect(
      result.current.option.series[0].data.every(point => point.itemStyle.borderWidth === 0.5),
      "tiles retain their normal grid borders"
    ).toBe(true);
  });

  it("clears the overlay and hides off-screen cell selections without losing them", () => {
    const { result, rerender } = renderHook(
      ({ selection, colStart }) =>
        useTechniqueIntentHeatmapOptions(view, false, { selection, colStart, colSpan: 1 }),
      {
        initialProps: {
          selection: { axis: "cell" as const, technique: "demon:one", intent: "i1" },
          colStart: 0,
        },
      }
    );
    expect(
      result.current.option.graphic.elements[0].ignore,
      "the selected cell is initially visible"
    ).toBe(false);
    rerender({ selection: { axis: "cell", technique: "demon:one", intent: "i1" }, colStart: 1 });
    expect(
      result.current.option.graphic.elements[0].ignore,
      "off-screen selections are not outlined over another cell"
    ).toBe(true);
    rerender({ selection: { axis: "cell", technique: "demon:one", intent: "i1" }, colStart: 0 });
    expect(
      result.current.option.graphic.elements[0].ignore,
      "panning back restores the same outline"
    ).toBe(false);
  });

  it("zooms out to the full matrix without changing scores", () => {
    const large = buildMatrixView({
      t: Object.fromEntries(Array.from({ length: 52 }, (_, i) => [`i${i}`, counts(0.4)])),
    });
    const { result } = renderHook(() =>
      useTechniqueIntentHeatmapOptions(large, false, { width: 1200, colSpan: 52 })
    );
    expect(result.current.colCount, "all intents fit in the overview").toBe(52);
    expect(
      result.current.option.series[0].data[0].label.show,
      "dense cells defer percentages to hover and detail"
    ).toBe(false);
    expect(
      result.current.option.series[0].data[0].value[2],
      "zoom leaves the pass rate unchanged"
    ).toBe(0.4);
  });

  it("angles full intent codes in the overview without ellipses or a tall name header", () => {
    const code = "C002controversial";
    const dense = buildMatrixView({
      t: Object.fromEntries(
        Array.from({ length: 52 }, (_, i) => [
          `${code}${i}`,
          { ...counts(0.4), name: "A long readable intent name" },
        ])
      ),
    });
    const { result } = renderHook(() =>
      useTechniqueIntentHeatmapOptions(dense, false, { width: 1440, colSpan: 52 })
    );
    const labels = result.current.option.xAxis.axisLabel;
    expect(labels.rotate, "dense intent codes tilt only as needed").toBeGreaterThan(0);
    expect(labels.rotate, "labels remain as horizontal as space allows").toBeLessThan(85);
    expect(labels.formatter(`${code}0`), "the taxonomy code is never shortened").toBe(`${code}0`);
    expect(labels.width, "codes have no truncation width").toBeUndefined();
    expect(labels.overflow, "no ellipsis is added to overview codes").toBeUndefined();
    expect(
      result.current.option.grid.top,
      "only enough space for rotated codes is reserved"
    ).toBeLessThan(180);
  });

  it.each([false, true])("alternates readable KUI label tones in dark=%s", isDark => {
    const variable = isDark ? "--color-gray-300" : "--color-gray-600";
    const muted = isDark ? "#a7a7a7" : "#636363";
    document.documentElement.style.setProperty(variable, muted);
    try {
      const { result } = renderHook(() => useTechniqueIntentHeatmapOptions(view, isDark));
      const color = result.current.option.xAxis.axisLabel.color;
      expect(color(view.cols[0]), "the first label retains the normal text tone").not.toBe(muted);
      expect(color(view.cols[1]), "the neighbouring label uses a readable neutral tone").toBe(
        muted
      );
    } finally {
      document.documentElement.style.removeProperty(variable);
    }
  });

  it("flattens labels when the viewport grows and keeps short codes horizontal", () => {
    const dense = buildMatrixView({
      t: Object.fromEntries(
        Array.from({ length: 52 }, (_, i) => [`C002controversial${i}`, counts(0.4)])
      ),
    });
    const { result, rerender } = renderHook(
      ({ width }) => useTechniqueIntentHeatmapOptions(dense, false, { width, colSpan: 52 }),
      { initialProps: { width: 1440 } }
    );
    const narrowAngle = result.current.option.xAxis.axisLabel.rotate;
    rerender({ width: 2560 });
    expect(
      result.current.option.xAxis.axisLabel.rotate,
      "more space needs less rotation"
    ).toBeLessThan(narrowAngle);
    const short = buildMatrixView({
      t: Object.fromEntries(
        Array.from({ length: 52 }, (_, i) => [String.fromCharCode(65 + i), counts(0.4)])
      ),
    });
    const { result: shortResult } = renderHook(() =>
      useTechniqueIntentHeatmapOptions(short, false, { width: 1440, colSpan: 52 })
    );
    expect(
      shortResult.current.option.xAxis.axisLabel.rotate,
      "short labels stay horizontal at the same density"
    ).toBe(0);
    expect(shortResult.current.option.xAxis.axisLabel.interval, "all short labels fit").toBe(0);
  });

  it("reduces the visible column count on narrow screens without shrinking text", () => {
    const { result } = renderHook(() =>
      useTechniqueIntentHeatmapOptions(view, false, { width: 390 })
    );
    expect(result.current.colCount, "a narrow screen shows fewer readable columns").toBe(1);
    expect(result.current.option.yAxis.axisLabel.width, "row labels stay inside the chart").toBe(
      120
    );
  });
});
