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
