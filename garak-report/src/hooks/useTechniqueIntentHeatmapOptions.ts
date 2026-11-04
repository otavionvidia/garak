/**
 * @file useTechniqueIntentHeatmapOptions.ts
 * @description ECharts options for the technique × intent pass-rate matrix.
 * @module hooks
 *
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { createElement, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { format } from "echarts";
import TechniqueIntentTooltip, {
  TechniqueIntentAxisTooltip,
} from "../components/TechniqueIntent/TechniqueIntentTooltip";
import { ABSOLUTE_DEFCON_BOUNDS, scoreToDefcon, THEME_COLORS } from "../constants";
import { formatRate } from "../utils/formatPercentage";
import {
  buildAxisGroups,
  type MatrixView,
  type TaxonomyAxis,
} from "../utils/techniqueIntentRollup";
import useSeverityColor from "./useSeverityColor";

/** A plotted pairing; -1 renders an untested tile outside the pass-rate scale. */
export interface HeatmapCell {
  value: [number, number, number];
  rowKey: string;
  colKey: string;
}

/** A cell or a complete taxonomy axis selected in the matrix. */
export type HeatmapSelection =
  | { axis: "cell"; technique: string; intent: string }
  | { axis: "technique" | "intent"; key: string };

interface HeatmapOptions {
  selection?: HeatmapSelection | null;
  selectedDefcons?: number[];
  width?: number;
  colSpan?: number;
  colStart?: number;
}

/** Chooses black or white text for contrast against a resolved KUI colour. */
const contrastText = (hex: string): string => {
  const channels = hex.replace("#", "").match(/.{2}/g);
  if (channels?.length !== 3) return "#ffffff";
  const [r, g, b] = channels.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#000000" : "#ffffff";
};

/** Builds a zoomable intent window with all techniques shown at their natural height. */
export function useTechniqueIntentHeatmapOptions(
  view: MatrixView,
  isDark?: boolean,
  { selection, selectedDefcons, width = 1200, colSpan, colStart = 0 }: HeatmapOptions = {}
) {
  const { getDefconColor } = useSeverityColor();
  const textColor = isDark ? THEME_COLORS.text.dark : THEME_COLORS.text.light;
  const borderColor = isDark
    ? THEME_COLORS.chart.splitLine.dark
    : THEME_COLORS.chart.splitLine.light;
  const left = width < 600 ? 144 : 248;
  const colCount = Math.min(
    view.cols.length,
    Math.max(1, colSpan ?? Math.floor((width - left - 48) / 132))
  );
  const rowCount = view.rows.length;
  const firstCol = Math.max(0, Math.min(colStart, view.cols.length - colCount));
  const right = 48;
  const columnWidth = (width - left - right) / Math.max(1, colCount);
  const compactLabels = columnWidth < 100;
  const rowHeight = Math.max(24, Math.min(44, columnWidth));
  const labelFontSize = 13;
  const labelLineHeight = 18;
  const labelGap = 4;
  const labelFont = `${labelFontSize}px sans-serif`;
  const visibleCodes = view.cols.slice(firstCol, firstCol + colCount);
  const codeRects = visibleCodes.map(key => format.getTextRect(key, labelFont));
  const codeHeight = Math.max(labelFontSize, ...codeRects.map(rect => rect.height));
  const longestCode = Math.max(0, ...codeRects.map(rect => rect.width));
  const labelInterval = compactLabels
    ? Math.max(
        0,
        Math.ceil((codeHeight + labelGap) / (columnWidth * Math.sin((85 * Math.PI) / 180))) - 1
      )
    : 0;
  const labelSpacing = columnWidth * (labelInterval + 1);
  const followingCodeWidth = Math.max(0, ...codeRects.slice(1).map(rect => rect.width));
  let labelAngle = 0;
  if (compactLabels && codeRects.length > 1) {
    // Parallel labels separate either along their text or across their height.
    while (labelAngle < 85) {
      const radians = (labelAngle * Math.PI) / 180;
      if (
        followingCodeWidth + labelGap <= labelSpacing * Math.cos(radians) ||
        codeHeight + labelGap <= labelSpacing * Math.sin(radians)
      )
        break;
      labelAngle++;
    }
  }
  const labelWidth = Math.max(80, Math.floor(columnWidth) - 12);
  const labelLines = Math.max(
    1,
    ...visibleCodes.map(
      key => 1 + Math.ceil(format.getTextRect(view.colLabel(key), labelFont).width / labelWidth)
    )
  );
  const top = compactLabels
    ? Math.ceil(longestCode * Math.sin((labelAngle * Math.PI) / 180) + codeHeight) + 20
    : labelLines * labelLineHeight + 24;
  const bottom = colCount < view.cols.length ? 48 : 16;

  const option = useMemo(() => {
    const colours = [1, 2, 3, 4, 5].map(getDefconColor);
    const theme =
      typeof document === "undefined" ? undefined : getComputedStyle(document.documentElement);
    const alternateLabelColor =
      theme?.getPropertyValue(isDark ? "--color-gray-300" : "--color-gray-600").trim() || textColor;
    const quietBorderColor =
      theme
        ?.getPropertyValue(
          isDark ? "--color-translucent-white-100" : "--color-translucent-black-100"
        )
        .trim() || borderColor;
    const data = view.rows.flatMap((rowKey, y) =>
      view.cols.map((colKey, x) => {
        const cell = view.cell(rowKey, colKey);
        const selected =
          selection?.axis === "cell"
            ? selection.technique === rowKey && selection.intent === colKey
            : selection?.axis === "technique"
              ? selection.key === rowKey
              : selection?.axis === "intent" && selection.key === colKey;
        const colour = cell ? colours[scoreToDefcon(cell.score) - 1] : "transparent";
        const labelColour = cell ? contrastText(colour) : textColor;
        return {
          // Null values are skipped by ECharts, including their labels.
          value: [x, y, cell?.score ?? -1] as HeatmapCell["value"],
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
            borderColor: cell ? borderColor : quietBorderColor,
            borderWidth: 0.5,
          },
          label: {
            show: columnWidth >= 52,
            formatter: cell ? formatRate(cell.score) : "—",
            color: labelColour,
            opacity: cell ? 1 : 0.35,
            fontSize: 12,
            fontWeight: selected ? "bold" : "normal",
          },
          emphasis: { label: { color: labelColour } },
        };
      })
    );

    const selectedRow =
      selection?.axis === "intent"
        ? 0
        : view.rows.indexOf(
            selection?.axis === "cell" ? selection.technique : (selection?.key ?? "")
          );
    const selectedCol =
      selection?.axis === "technique"
        ? firstCol
        : view.cols.indexOf(selection?.axis === "cell" ? selection.intent : (selection?.key ?? ""));
    const selectionVisible =
      !!selection &&
      selectedRow >= 0 &&
      selectedCol >= firstCol &&
      selectedCol < firstCol + colCount;
    const selectionOutline = {
      id: "technique-intent-selection",
      type: "rect",
      silent: true,
      z: 100,
      ignore: !selectionVisible,
      shape: {
        x: left + (selectedCol - firstCol) * columnWidth,
        y: top + selectedRow * rowHeight,
        width: selection?.axis === "technique" ? colCount * columnWidth : columnWidth,
        height: selection?.axis === "intent" ? view.rows.length * rowHeight : rowHeight,
      },
      style: { fill: "transparent", stroke: textColor, lineWidth: 2 },
    };

    const tooltipCache = new Map<string, string>();
    const axisTooltip = (axis: TaxonomyAxis) => {
      const groups = new Map(buildAxisGroups(view, axis).map(group => [group.key, group]));
      return {
        show: true,
        formatter: ({ value }: { value: string }) => {
          const group = groups.get(String(value));
          if (!group) return "";
          const key = JSON.stringify([axis, group.key]);
          let html = tooltipCache.get(key);
          if (!html) {
            html = renderToStaticMarkup(
              createElement(TechniqueIntentAxisTooltip, {
                group,
                axis,
                total: axis === "technique" ? view.cols.length : view.rows.length,
              })
            );
            tooltipCache.set(key, html);
          }
          return html;
        },
      };
    };
    const axisPointer = {
      show: true,
      type: "shadow",
      triggerTooltip: false,
      triggerEmphasis: false,
      label: { show: false },
      shadowStyle: { color: textColor, opacity: 0.07 },
    };

    return {
      animation: false,
      aria: { enabled: true },
      graphic: { elements: [selectionOutline] },
      visualMap: {
        show: false,
        type: "piecewise",
        dimension: 2,
        pieces: [
          { gte: 0, lt: ABSOLUTE_DEFCON_BOUNDS.TERRIBLE, color: colours[0] },
          {
            gte: ABSOLUTE_DEFCON_BOUNDS.TERRIBLE,
            lt: ABSOLUTE_DEFCON_BOUNDS.BELOW_AVG,
            color: colours[1],
          },
          {
            gte: ABSOLUTE_DEFCON_BOUNDS.BELOW_AVG,
            lt: ABSOLUTE_DEFCON_BOUNDS.ABOVE_AVG,
            color: colours[2],
          },
          {
            gte: ABSOLUTE_DEFCON_BOUNDS.ABOVE_AVG,
            lt: ABSOLUTE_DEFCON_BOUNDS.EXCELLENT,
            color: colours[3],
          },
          { gte: ABSOLUTE_DEFCON_BOUNDS.EXCELLENT, lte: 1, color: colours[4] },
        ],
        outOfRange: { color: "transparent" },
      },
      grid: { left, right, top, bottom },
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          show: view.cols.length > colCount,
          startValue: firstCol,
          endValue: firstCol + colCount - 1,
          zoomLock: false,
          brushSelect: false,
          showDetail: false,
          showDataShadow: false,
          bottom: 8,
          height: 20,
          borderColor,
          textStyle: { color: textColor },
        },
      ],
      tooltip: {
        trigger: "item",
        confine: false,
        transitionDuration: 0,
        hideDelay: 80,
        enterable: false,
        padding: 16,
        backgroundColor: "var(--background-color-surface-overlay)",
        borderColor: "var(--border-color-base)",
        borderWidth: 1,
        textStyle: { color: textColor },
        extraCssText:
          "width: min(320px, calc(100vw - 64px)); box-sizing: border-box; white-space: normal; overflow-wrap: anywhere; border-radius: var(--radius-md); box-shadow: var(--shadow-md); pointer-events: none;",
        position: (
          point: number[],
          params: unknown,
          _dom: HTMLElement,
          rect: { x: number; y: number; width: number; height: number } | null,
          size: { contentSize: number[]; viewSize: number[] }
        ) => {
          const [tooltipWidth, tooltipHeight] = size.contentSize;
          const [viewWidth, viewHeight] = size.viewSize;
          const data = (params as { data?: HeatmapCell }).data;
          const cell = data
            ? {
                x: left + (data.value[0] - firstCol) * columnWidth,
                y: top + data.value[1] * rowHeight,
                width: columnWidth,
                height: rowHeight,
              }
            : (rect ?? { x: point[0], y: point[1], width: 0, height: 0 });
          const bounds = _dom.parentElement?.getBoundingClientRect();
          const visibleTop = bounds ? 8 - bounds.top : 0;
          const visibleBottom = bounds ? window.innerHeight - bounds.top - 8 : viewHeight;
          const gap = 12;
          const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));
          const clampY = (y: number) =>
            Math.max(visibleTop, Math.min(y, visibleBottom - tooltipHeight));
          // Anchor to the cell instead of following tiny movements inside it.
          if (cell.x + cell.width + gap + tooltipWidth <= viewWidth) {
            return [cell.x + cell.width + gap, clampY(cell.y)];
          }
          if (cell.x - gap - tooltipWidth >= 0) {
            return [cell.x - gap - tooltipWidth, clampY(cell.y)];
          }
          const x = clamp(cell.x + cell.width / 2 - tooltipWidth / 2, viewWidth - tooltipWidth);
          return [
            x,
            cell.y - visibleTop >= tooltipHeight + gap
              ? cell.y - tooltipHeight - gap
              : clampY(cell.y + cell.height + gap),
          ];
        },
        formatter: ({ data: point }: { data: HeatmapCell }) => {
          const key = JSON.stringify([point.rowKey, point.colKey]);
          let html = tooltipCache.get(key);
          if (!html) {
            html = renderToStaticMarkup(
              createElement(TechniqueIntentTooltip, {
                view,
                technique: point.rowKey,
                intent: point.colKey,
              })
            );
            tooltipCache.set(key, html);
          }
          return html;
        },
      },
      xAxis: {
        type: "category",
        tooltip: axisTooltip("intent"),
        axisPointer,
        position: "top",
        data: view.cols,
        triggerEvent: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          interval: labelInterval,
          rotate: labelAngle,
          align: compactLabels && labelAngle > 0 ? "right" : undefined,
          verticalAlign: compactLabels && labelAngle > 0 ? "middle" : undefined,
          fontSize: labelFontSize,
          width: compactLabels ? undefined : labelWidth,
          lineHeight: labelLineHeight,
          overflow: compactLabels ? undefined : "break",
          color: (key: string) =>
            Math.floor(view.cols.indexOf(key) / (labelInterval + 1)) % 2 === 0
              ? textColor
              : alternateLabelColor,
          formatter: (key: string) =>
            compactLabels ? key : view.colLabel(key).replace(" - ", "\n"),
        },
      },
      yAxis: {
        type: "category",
        tooltip: axisTooltip("technique"),
        axisPointer,
        inverse: true,
        data: view.rows,
        triggerEvent: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          interval: 0,
          width: left - 24,
          height: Math.min(40, rowHeight - 4),
          lineHeight: 16,
          overflow: "break",
          lineOverflow: "truncate",
          color: textColor,
          formatter: view.rowLabel,
        },
      },
      series: [
        {
          type: "heatmap",
          data,
          emphasis: { disabled: true },
        },
      ],
    };
  }, [
    view,
    isDark,
    getDefconColor,
    textColor,
    borderColor,
    selection,
    selectedDefcons,
    left,
    right,
    compactLabels,
    labelAngle,
    labelWidth,
    colCount,
    firstCol,
    columnWidth,
    labelInterval,
    rowHeight,
    top,
    bottom,
  ]);

  return {
    option,
    height: rowCount * rowHeight + top + bottom,
    firstCol,
    rowCount,
    colCount,
  };
}
