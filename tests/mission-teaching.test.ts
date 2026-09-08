import { expect, test } from "vitest";
import { exercises } from "../src/course/registry";
import { missionTeaching } from "../src/course/missions/teaching";
import { predictions } from "../src/course/missions/predictions";

test("every mission introduces its concept and example in both course languages", () => {
  expect(Object.keys(missionTeaching).sort()).toEqual(
    exercises.map((e) => e.id).sort(),
  );
  for (const e of exercises) {
    const note = missionTeaching[e.id]!;
    expect(
      note.concept.every((text) => text.trim().length > 0),
      e.id,
    ).toBe(true);
    expect(
      note.example.every((text) => text.trim().length > 0),
      e.id,
    ).toBe(true);
  }
});

test("prediction choices have an answer and an explanation without adding progression rules", () => {
  for (const [id, question] of Object.entries(predictions)) {
    if (!question) throw new Error("Missing prediction: " + id);
    expect(
      missionTeaching[id as keyof typeof missionTeaching],
      id,
    ).toBeDefined();
    expect(question.choices[question.answer], id).toBeDefined();
    expect(
      question.explanation.every((text) => text.trim().length > 0),
      id,
    ).toBe(true);
  }
});

test("every mission has distinct, lesson-specific hints in both languages", () => {
  for (const language of [0, 1]) {
    const nudges = new Set<string>();
    for (const e of exercises) {
      const hints = e.hints.map((copy) => copy[language]);
      expect(hints.length, e.id).toBeGreaterThanOrEqual(3);
      expect(
        hints.every((text) => text.trim().length > 0),
        e.id,
      ).toBe(true);
      expect(new Set(hints).size, e.id).toBe(hints.length);
      expect(hints, e.id).not.toContain(e.mission!.concept[language]);
      expect(nudges.has(hints[0]), `Repeated first hint: ${e.id}`).toBe(false);
      nudges.add(hints[0]);
    }
  }
});

test("harder lessons use smaller nudges beyond the third hint", () => {
  const xor = exercises.find((e) => e.id === "core-09")!.hints;
  expect(xor).toHaveLength(6);
  expect(xor[1][0]).toContain("Which one");
  expect(xor[3][0]).toContain("What gate");
  expect(xor.flat().join(" ")).not.toContain("NAND(NAND");
  expect(exercises.find((e) => e.id === "core-48")!.hints).toHaveLength(7);
});
