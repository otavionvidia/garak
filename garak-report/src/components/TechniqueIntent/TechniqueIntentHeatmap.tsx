/**
 * @file TechniqueIntentHeatmap.tsx
 * @description Technique × intent heatmap with persistent selection and inline details.
 * @module components/TechniqueIntent
 *
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { graphic, type ECElementEvent } from "echarts";
import {
  Button,
  ButtonGroup,
  Flex,
  PageHeader,
  Stack,
  StatusMessage,
  Text,
  Tooltip,
} from "@kui/react";
import { Info, Minus, Plus } from "lucide-react";
import { DEFCON_LEVELS, DEFCON_LABELS, DEFCON_PCT_RANGE } from "../../constants";
import useSeverityColor from "../../hooks/useSeverityColor";
import {
  useTechniqueIntentHeatmapOptions,
  type HeatmapCell,
  type HeatmapSelection,
} from "../../hooks/useTechniqueIntentHeatmapOptions";
import { buildAxisGroups, type MatrixView } from "../../utils/techniqueIntentRollup";
import { CellDetail, GroupChildren } from "./TaxonomyAxisList";

export type { HeatmapSelection } from "../../hooks/useTechniqueIntentHeatmapOptions";

interface TechniqueIntentHeatmapProps {
  view: MatrixView;
  isDark?: boolean;
  selection: HeatmapSelection | null;
  onSelectionChange: (selection: HeatmapSelection | null) => void;
  selectedDefcons?: number[];
  onToggleDefcon: (level: number) => void;
}

/** Keeps labels fixed while navigating the matrix and reveals selected details inline. */
const TechniqueIntentHeatmap = ({
  view,
  isDark,
  selection,
  onSelectionChange,
  selectedDefcons,
  onToggleDefcon,
}: TechniqueIntentHeatmapProps) => {
  const viewport = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const chart = useRef<ReactECharts>(null);
  const hoverBand = useRef<InstanceType<typeof graphic.Rect> | null>(null);
  const [width, setWidth] = useState(1200);
  const [matrixWindow, setMatrixWindow] = useState<{ colStart: number; colSpan?: number }>({
    colStart: 0,
    colSpan: view.cols.length,
  });
  const { option, height, firstCol, colCount } = useTechniqueIntentHeatmapOptions(view, isDark, {
    selection,
    selectedDefcons,
    width,
    ...matrixWindow,
  });
  const { getDefconColor } = useSeverityColor();

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0].contentRect.width > 0) setWidth(entries[0].contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selection) return;
    details.current?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [selection]);

  const group = useMemo(() => {
    if (!selection || selection.axis === "cell") return undefined;
    return buildAxisGroups(view, selection.axis).find(item => item.key === selection.key);
  }, [view, selection]);
  const cell =
    selection?.axis === "cell" ? view.cell(selection.technique, selection.intent) : undefined;
  const title =
    selection?.axis === "cell"
      ? `${view.rowLabel(selection.technique)} × ${view.colLabel(selection.intent)}`
      : group?.label;

  const handleClick = (params: ECElementEvent) => {
    let next: HeatmapSelection | undefined;
    if (params.componentType === "xAxis" && view.cols.includes(String(params.value))) {
      next = { axis: "intent", key: String(params.value) };
    } else if (params.componentType === "yAxis" && view.rows.includes(String(params.value))) {
      next = { axis: "technique", key: String(params.value) };
    } else if (params.componentType === "series") {
      const point = params.data as HeatmapCell | undefined;
      if (point && view.cell(point.rowKey, point.colKey)) {
        next = { axis: "cell", technique: point.rowKey, intent: point.colKey };
      }
    }
    if (next) {
      const sameSelection =
        selection?.axis === next.axis &&
        (selection.axis === "cell" && next.axis === "cell"
          ? selection.technique === next.technique && selection.intent === next.intent
          : selection.axis !== "cell" && next.axis !== "cell" && selection.key === next.key);
      onSelectionChange(sameSelection ? null : next);
    }
  };

  const clearAxisHover = () => {
    if (!hoverBand.current) return;
    chart.current?.getEchartsInstance().getZr().remove(hoverBand.current);
    hoverBand.current = null;
  };

  const handleAxisHover = (params: ECElementEvent) => {
    const key = String(params.value);
    const isIntent = params.componentType === "xAxis" && view.cols.includes(key);
    const isTechnique = params.componentType === "yAxis" && view.rows.includes(key);
    if (!isIntent && !isTechnique) return;
    clearAxisHover();
    const plotWidth = width - option.grid.left - option.grid.right;
    const plotHeight = height - option.grid.top - option.grid.bottom;
    const columnWidth = plotWidth / colCount;
    const rowHeight = plotHeight / view.rows.length;
    hoverBand.current = new graphic.Rect({
      silent: true,
      z: 10,
      shape: {
        x: option.grid.left + (isIntent ? (view.cols.indexOf(key) - firstCol) * columnWidth : 0),
        y: option.grid.top + (isTechnique ? view.rows.indexOf(key) * rowHeight : 0),
        width: isIntent ? columnWidth : plotWidth,
        height: isTechnique ? rowHeight : plotHeight,
      },
      style: {
        fill: getComputedStyle(viewport.current!)
          .getPropertyValue("--background-color-interaction-hover")
          .trim(),
      },
    });
    chart.current?.getEchartsInstance().getZr().add(hoverBand.current);
  };

  useEffect(
    () => () => {
      if (hoverBand.current) {
        chart.current?.getEchartsInstance().getZr().remove(hoverBand.current);
        hoverBand.current = null;
      }
    },
    [view, width, firstCol, colCount]
  );

  const handleDataZoom = () => {
    const zoom = chart.current?.getEchartsInstance().getOption().dataZoom as
      | { startValue?: number; endValue?: number }[]
      | undefined;
    if (zoom) {
      const start = zoom[0].startValue ?? 0;
      setMatrixWindow({
        colStart: start,
        colSpan: (zoom[0].endValue ?? view.cols.length - 1) - start + 1,
      });
    }
  };

  if (!view.rows.length || !view.cols.length) {
    return <StatusMessage size="small" slotHeading="No evaluated technique/intent pairings" />;
  }

  return (
    <Stack gap="density-md">
      <PageHeader
        kind="flat"
        density="compact"
        attributes={{ PageHeaderFooter: { style: { alignSelf: "start" } } }}
        slotHeading={
          <Flex align="center" gap="density-xs">
            <Text kind="title/sm" role="heading" aria-level={2}>
              Technique × Intent
            </Text>
            <Tooltip
              slotContent="Select a cell, technique or intent for details below. Use the zoom buttons for more detail, then drag the navigation bar to move across intents. Reset zoom returns to the full matrix."
              style={{ maxWidth: 320 }}
            >
              <Button kind="tertiary" size="small" aria-label="About the heatmap">
                <Info size={16} aria-hidden="true" />
              </Button>
            </Tooltip>
          </Flex>
        }
        slotDescription={
          <Stack gap="density-xs">
            <Text kind="body/regular/sm" aria-live="polite">
              {view.rows.length} techniques ·{" "}
              {colCount === view.cols.length
                ? `${view.cols.length} intents`
                : `Intents ${firstCol + 1}–${firstCol + colCount} of ${view.cols.length}`}
            </Text>
            <Text kind="body/regular/sm">Pass rate · Lower pass rates mean more failures.</Text>
          </Stack>
        }
        slotActions={
          <Flex align="center" gap="density-sm">
            <ButtonGroup kind="secondary" color="neutral" size="small" aria-label="Heatmap zoom">
              <Tooltip slotContent="Zoom out">
                <Button
                  kind="secondary"
                  color="neutral"
                  size="small"
                  aria-label="Zoom out"
                  disabled={colCount === view.cols.length}
                  onClick={() =>
                    setMatrixWindow(current => ({
                      ...current,
                      colSpan: Math.min(view.cols.length, colCount * 2),
                    }))
                  }
                >
                  <Minus size={16} aria-hidden="true" />
                </Button>
              </Tooltip>
              <Tooltip slotContent="Zoom in">
                <Button
                  kind="secondary"
                  color="neutral"
                  size="small"
                  aria-label="Zoom in"
                  disabled={colCount <= 1}
                  onClick={() =>
                    setMatrixWindow(current => ({
                      ...current,
                      colSpan: Math.max(1, Math.ceil(colCount / 2)),
                    }))
                  }
                >
                  <Plus size={16} aria-hidden="true" />
                </Button>
              </Tooltip>
            </ButtonGroup>
            <Button
              kind="tertiary"
              size="small"
              disabled={colCount === view.cols.length}
              onClick={() => setMatrixWindow({ colStart: 0, colSpan: view.cols.length })}
            >
              Reset zoom
            </Button>
          </Flex>
        }
      />
      <Flex
        align="center"
        gap="density-xs"
        wrap="wrap"
        role="group"
        aria-label="Pass rate legend and risk focus"
      >
        {DEFCON_LEVELS.map(level => {
          const active = selectedDefcons?.includes(level) ?? true;
          return (
            <Tooltip
              key={level}
              slotContent={`DC-${level} · ${DEFCON_LABELS[level]} · ${DEFCON_PCT_RANGE[level]}. Select to ${active ? "dim" : "restore"} this risk level.`}
            >
              <Button
                kind={active ? "secondary" : "tertiary"}
                color="neutral"
                size="small"
                aria-label={`DC-${level} · ${DEFCON_LABELS[level]} · ${DEFCON_PCT_RANGE[level]}`}
                aria-pressed={active}
                onClick={() => onToggleDefcon(level)}
              >
                <span
                  aria-hidden="true"
                  style={{
                    backgroundColor: getDefconColor(level),
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    opacity: active ? 1 : 0.3,
                  }}
                />
                DC-{level}
              </Button>
            </Tooltip>
          );
        })}
        <Text kind="label/regular/sm">— Not evaluated</Text>
      </Flex>
      {selectedDefcons && selectedDefcons.length < DEFCON_LEVELS.length && (
        <Text kind="body/regular/sm">
          Other risk levels are dimmed. Summaries include all evaluations; selected results stay
          visible.
        </Text>
      )}
      <div ref={viewport} role="region" aria-label="Technique by intent pass rates">
        <ReactECharts
          ref={chart}
          option={option}
          style={{ height, width: "100%" }}
          onEvents={{
            click: handleClick,
            datazoom: handleDataZoom,
            mouseover: handleAxisHover,
            mouseout: clearAxisHover,
            globalout: clearAxisHover,
          }}
        />
      </div>
      {selection && (cell || group) && (
        <Stack ref={details} gap="density-md" style={{ scrollMarginTop: "4rem" }}>
          <Flex align="center" justify="between" gap="density-md" wrap="wrap">
            <Text kind="title/sm">{title}</Text>
            <Flex gap="density-sm">
              <Button kind="tertiary" size="small" onClick={() => onSelectionChange(null)}>
                Clear selection
              </Button>
            </Flex>
          </Flex>
          {selection.axis === "cell" && (
            <>
              {view.rowDescription(selection.technique) && (
                <Text kind="body/regular/sm">{view.rowDescription(selection.technique)}</Text>
              )}
              {view.colDescription(selection.intent) && (
                <Text kind="body/regular/sm">{view.colDescription(selection.intent)}</Text>
              )}
            </>
          )}
          {cell && <CellDetail cell={cell} />}
          {group && (
            <>
              {group.description && <Text kind="body/regular/sm">{group.description}</Text>}
              <GroupChildren
                key={`${selection.axis}:${group.key}`}
                group={group}
                childNoun={selection.axis === "technique" ? "intent" : "technique"}
                isDark={isDark}
              />
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default TechniqueIntentHeatmap;
