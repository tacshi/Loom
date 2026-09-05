import { it, expect } from "vitest";
import { checkpoints } from "../src/learning/checkpoints";
import { Engine, runVectors } from "../src/simulator/engine";
import { validateProject } from "../src/persistence/validation";
for (const checkpoint of checkpoints) {
  it(checkpoint.id + " reference passes while starter needs work", () => {
    const ref = checkpoint.reference();
    expect(validateProject(ref).id).toBe(ref.id);
    expect(new Engine(ref).valid).toBe(true);
    const vectors = ref.circuits[ref.root].vectors;
    expect(vectors.length).toBeGreaterThan(0);
    expect(runVectors(ref, ref.root, vectors).every((r) => r.passed)).toBe(
      true,
    );
    const starter = checkpoint.starter();
    expect(
      runVectors(
        starter,
        starter.root,
        starter.circuits[starter.root].vectors,
      ).some((r) => !r.passed),
    ).toBe(true);
  });
}
