/**
 * @copyright NVIDIA Corporation 2023-2026
 * @license Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { buildAxisGroups, buildMatrixView } from "../techniqueIntentRollup";
import { matrix } from "./techniqueIntentFixtures";
describe("techniqueIntentGroups", () => {
  it("lists a technique's intents worst-first", () => {
    const groups = buildAxisGroups(buildMatrixView(matrix), "technique");
    const userPersona = groups.find(
      entry => entry.key === "demon:Fictionalizing:Roleplaying:User_persona"
    );

    expect(userPersona, "the technique is represented").toBeDefined();
    expect(userPersona?.score, "the technique surfaces its worst pairing").toBe(0);
    expect(
      userPersona?.cells.map(entry => entry.otherKey),
      "intent pairings are sorted worst-first"
    ).toEqual(["T009ignore", "S005hate"]);
    expect(userPersona?.nEvaluations, "evaluation totals span the technique's pairings").toBe(160);
  });
  it("lists an intent's techniques worst-first", () => {
    const groups = buildAxisGroups(buildMatrixView(matrix), "intent");
    const t009 = groups.find(entry => entry.key === "T009ignore");

    expect(t009, "the intent is represented").toBeDefined();
    expect(t009?.score, "the intent surfaces its worst pairing").toBe(0);
    expect(
      t009?.cells.map(entry => entry.otherKey),
      "technique pairings are sorted worst-first"
    ).toEqual([
      "demon:Fictionalizing:Roleplaying:User_persona",
      "demon:Fictionalizing:Roleplaying:DAN_and_target_persona",
    ]);
  });
  it("returns no entries for an empty matrix", () => {
    expect(
      buildAxisGroups(buildMatrixView({}), "technique"),
      "empty input has no axis entries"
    ).toHaveLength(0);
  });
});
