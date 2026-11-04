/**
 * @file TechniqueIntentTooltip.test.tsx
 * @description Checks pairing preview identity, score meaning and missing data.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TechniqueIntentTooltip, { TechniqueIntentAxisTooltip } from "../TechniqueIntentTooltip";
import { buildAxisGroups, buildMatrixView } from "../../../utils/techniqueIntentRollup";

const measured = { score: 0, passed: 0, total_evaluated: 10, nones: 2, n_detectors: 2 };
const view = buildMatrixView(
  {
    t1: { _summary: { name: "Target persona", n_intents: 1, n_detectors: 2 }, i1: measured },
    t2: { i2: { ...measured, score: 1, passed: 10, nones: 0 } },
  },
  { i1: { name: "Disinformation", descr: "Present false claims as fact." } }
);

describe("TechniqueIntentTooltip", () => {
  it("identifies both axes and explains measured failures", () => {
    render(<TechniqueIntentTooltip view={view} technique="t1" intent="i1" />);
    expect(screen.getByText("Technique"), "axis roles are explicit").toBeVisible();
    expect(screen.getByText("Target persona"), "the full technique name is present").toBeVisible();
    expect(screen.getByText("Intent"), "intent has its own label").toBeVisible();
    expect(
      screen.getByText(/i1 - Disinformation/),
      "intent code and name are retained"
    ).toBeVisible();
    expect(screen.getByText("0%"), "zero remains a measured result").toBeVisible();
    expect(screen.getByText("DC-1"), "risk uses the report's existing scale").toBeVisible();
    expect(screen.getByText("Critical Risk"), "the risk name is explicit").toBeVisible();
    expect(
      screen.getByRole("tooltip").textContent,
      "counts refer to evaluations rather than prompts"
    ).toContain("10 failed out of 10 evaluated");
    expect(
      screen.getByText(/2 undetermined \(excluded from pass rate\)/),
      "unknown verdicts stay separate"
    ).toBeVisible();
    expect(
      screen.getByText("Present false claims as fact."),
      "available intent context is included"
    ).toBeVisible();
  });

  it("shows an untested intersection without inventing a score or risk", () => {
    render(<TechniqueIntentTooltip view={view} technique="t1" intent="i2" />);
    expect(screen.getByText("Not evaluated"), "missing data has its own state").toBeVisible();
    expect(
      screen.getByText("No results for this pairing."),
      "missing data is explained"
    ).toBeVisible();
    expect(screen.queryByText("Pass rate"), "missing data is not a zero rate").toBeNull();
    expect(screen.queryByText(/DC-/), "untested pairings have no risk class").toBeNull();
  });

  it("omits an empty undetermined count for fully determined results", () => {
    render(<TechniqueIntentTooltip view={view} technique="t2" intent="i2" />);
    expect(screen.getByText("100%"), "perfect pass rates remain explicit").toBeVisible();
    expect(
      screen.queryByText(/undetermined/),
      "empty metadata does not crowd the preview"
    ).toBeNull();
    expect(
      screen.getByText("Select cell for full details below."),
      "selection offers persistent details"
    ).toBeVisible();
  });
});

describe("TechniqueIntentAxisTooltip", () => {
  it.each(["technique", "intent"] as const)(
    "previews a complete %s with explicit coverage and worst score",
    axis => {
      const key = axis === "technique" ? "t1" : "i1";
      const group = buildAxisGroups(view, axis).find(item => item.key === key)!;
      render(<TechniqueIntentAxisTooltip group={group} axis={axis} total={2} />);
      const totals = screen.getByRole("group", { name: "Across tested pairings" });
      expect(
        screen.getByText(axis === "intent" ? "Disinformation" : group.label),
        "the full axis name is visible"
      ).toBeVisible();
      expect(
        within(screen.getByRole("group", { name: "Weakest pairing" })).getByText("0%"),
        "the score is not presented as a pooled rate"
      ).toBeVisible();
      expect(
        within(screen.getByRole("group", { name: "Across tested pairings" })).getByText("1 of 2"),
        "coverage includes unevaluated intersections"
      ).toBeVisible();
      expect(
        within(totals).getByText("10 of 10"),
        "totals come from evaluated children"
      ).toBeVisible();
      expect(
        screen.getByText(group.cells[0].otherLabel),
        "the worst pairing is identified"
      ).toBeVisible();
      expect(
        screen.getByText(`Click ${axis === "technique" ? "row" : "column"} to inspect details.`),
        "selection guidance matches the hovered axis"
      ).toBeVisible();
    }
  );

  it("keeps a worst score separate from pooled counts and discloses tied pairings", () => {
    const mixed = buildMatrixView({
      t: { a: measured, b: measured, c: { ...measured, score: 1, passed: 10, nones: 0 } },
    });
    const group = buildAxisGroups(mixed, "technique")[0];
    render(<TechniqueIntentAxisTooltip group={group} axis="technique" total={4} />);
    expect(screen.getByText("0%"), "the existing worst-child score is retained").toBeVisible();
    expect(
      screen.getByRole("group", { name: "Across tested pairings" }).textContent,
      "pooled counts include passing pairings"
    ).toContain("20 of 30");
    expect(
      screen.getByText("1 other pairing at this pass rate."),
      "ties do not imply a unique worst child"
    ).toBeVisible();
    expect(screen.getByText("3 of 4"), "untested pairings stay outside the counts").toBeVisible();
  });
});
