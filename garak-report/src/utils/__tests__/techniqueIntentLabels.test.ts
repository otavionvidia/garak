/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { buildMatrixView } from "../techniqueIntentRollup";
import { intentDescription, intentName } from "../taxonomyLabels";
import { typology } from "./techniqueIntentFixtures";
import type { TechniqueIntentMatrix } from "../../types/ReportEntry";
describe("techniqueIntentLabels", () => {
  it("names and describes pairings from digest metadata", () => {
    const named: TechniqueIntentMatrix = {
      "demon:Cat:Sub:A": {
        _summary: {
          name: "Alpha technique",
          description: "Does alpha things",
          n_intents: 1,
          n_detectors: 1,
        },
        C001: {
          name: "matrix fallback",
          score: 0.5,
          passed: 50,
          total_evaluated: 100,
          nones: 0,
          n_detectors: 1,
        },
      },
    };
    const view = buildMatrixView(named, typology);

    expect(view.rowLabel("demon:Cat:Sub:A"), "technique name comes from its summary").toBe(
      "Alpha technique"
    );
    expect(view.rowDescription("demon:Cat:Sub:A"), "technique description is retained").toBe(
      "Does alpha things"
    );
    expect(view.colLabel("C001"), "intent label includes its code and typology name").toBe(
      `C001 - ${intentName("C001", typology)}`
    );
    expect(view.colDescription("C001"), "intent description comes from the typology").toBe(
      intentDescription("C001", typology)
    );
  });
  it("falls back to the matrix name and then the raw code", () => {
    const unknown: TechniqueIntentMatrix = {
      "demon:Cat:Sub:A": {
        Znovel: {
          name: "Digest Only",
          score: 0.5,
          passed: 50,
          total_evaluated: 100,
          nones: 0,
          n_detectors: 1,
        },
        Zbare: {
          score: 0.5,
          passed: 50,
          total_evaluated: 100,
          nones: 0,
          n_detectors: 1,
        },
      },
    };
    const view = buildMatrixView(unknown, typology);

    expect(view.colLabel("Znovel"), "matrix name is the first fallback").toBe(
      "Znovel - Digest Only"
    );
    expect(view.colLabel("Zbare"), "unknown unnamed intent uses its code").toBe("Zbare");
  });
});
