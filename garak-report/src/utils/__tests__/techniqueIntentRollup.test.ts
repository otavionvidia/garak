/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { buildMatrixView } from "../techniqueIntentRollup";
import { matrix } from "./techniqueIntentFixtures";
import type { TechniqueIntentMatrix } from "../../types/ReportEntry";
describe("techniqueIntentRollup", () => {
  it("preserves every concrete technique and intent key", () => {
    const view = buildMatrixView(matrix);

    expect(view.rows, "technique rows remain exact digest keys").toEqual([
      "demon:Fictionalizing:Roleplaying:User_persona",
      "demon:Fictionalizing:Roleplaying:DAN_and_target_persona",
      "demon:Language:Code_and_encode:Token",
    ]);
    expect(view.cols, "intent columns remain exact digest keys").toEqual([
      "T009ignore",
      "S005hate",
    ]);
    expect(
      view.cell("demon:Fictionalizing:Roleplaying:User_persona", "T009ignore")?.score,
      "the concrete pairing keeps its own score"
    ).toBe(0);
  });
  it("orders rows and columns by their worst pairing", () => {
    const view = buildMatrixView(matrix);

    expect(view.rows[0], "the technique containing the 0% pairing comes first").toBe(
      "demon:Fictionalizing:Roleplaying:User_persona"
    );
    expect(view.cols[0], "the intent containing the 0% pairing comes first").toBe("T009ignore");
  });
  it("keeps each pairing's counts unchanged", () => {
    const withCounts: TechniqueIntentMatrix = {
      "demon:Cat:Sub:A": {
        X: {
          score: 0.4,
          passed: 40,
          total_evaluated: 100,
          nones: 5,
          n_attempts: 20,
          n_detectors: 3,
        },
      },
    };
    const cell = buildMatrixView(withCounts).cell("demon:Cat:Sub:A", "X");

    expect(cell, "the pairing exists").toBeDefined();
    expect(cell?.passed, "passed count is unchanged").toBe(40);
    expect(cell?.nEvaluations, "evaluation count is unchanged").toBe(100);
    expect(cell?.nones, "undetermined count is unchanged").toBe(5);
    expect(cell?.nAttempts, "prompt count is unchanged").toBe(20);
    expect(cell?.nDetectors, "detector count is unchanged").toBe(3);
  });
  it("handles an empty matrix", () => {
    const view = buildMatrixView({});

    expect(view.rows, "empty input has no rows").toHaveLength(0);
    expect(view.cols, "empty input has no columns").toHaveLength(0);
    expect(view.cell("x", "y"), "empty input has no cells").toBeUndefined();
  });
});
