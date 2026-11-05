/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { buildMatrixView } from "../techniqueIntentRollup";
import type { TechniqueIntentMatrix } from "../../types/ReportEntry";
describe("techniqueIntentMatrixData", () => {
  it("skips the reserved per-row summary", () => {
    const withSummary: TechniqueIntentMatrix = {
      "demon:Cat:Sub:A": {
        _summary: { n_intents: 1, n_detectors: 2 },
        X: {
          score: 0.5,
          passed: 50,
          total_evaluated: 100,
          nones: 0,
          n_detectors: 2,
        },
      },
    };
    const view = buildMatrixView(withSummary);

    expect(view.cols, "the summary never becomes an intent column").toEqual(["X"]);
  });
  it("drops pairings that were not evaluated", () => {
    const sparse: TechniqueIntentMatrix = {
      "demon:Cat:Sub:A": {
        X: {
          score: null,
          passed: 0,
          total_evaluated: 0,
          nones: 0,
          n_detectors: 0,
        },
        Y: {
          score: 0.4,
          passed: 40,
          total_evaluated: 100,
          nones: 0,
          n_detectors: 1,
        },
      },
    };
    const view = buildMatrixView(sparse);

    expect(view.cols, "only evaluated intents are shown").toEqual(["Y"]);
    expect(view.cell("demon:Cat:Sub:A", "X"), "the unevaluated pairing is absent").toBeUndefined();
  });
});
