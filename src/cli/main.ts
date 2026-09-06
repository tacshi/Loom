#!/usr/bin/env node
import { checkCourse, reverifyCourse } from "../course/check";
import { exercises } from "../course/registry";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { parseProject, MAX_FILE_BYTES } from "../persistence/validation";
import { compile } from "../simulator/compiler";
import { runCases, reportCode } from "../verification/runner";
import { vectorCases } from "../verification/vectors";
import { canonical } from "../model/nets";
let phase: "input" | "execution" = "input";
async function main() {
  const [command, file, ...args] = process.argv.slice(2);
  if (!["validate", "test", "course-check"].includes(command) || !file) {
    process.stderr.write(
      "Usage: loom course-check project.loom.json [--json] | loom validate project.loom.json | loom test project.loom.json [--circuit <id>] [--json] [--report <directory>]\n",
    );
    return 2;
  }
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!["--circuit", "--json", "--report"].includes(key))
      throw new Error("Unknown option: " + key);
    if (key === "--json") options.set(key, "true");
    else {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("Missing value: " + key);
      options.set(key, args[++i]);
    }
  }
  if ((await stat(file)).size > MAX_FILE_BYTES) throw new Error("fileTooLarge");
  const text = await readFile(file, "utf8"),
    p = parseProject(text),
    root = options.get("--circuit") ?? p.root;
  if (!Object.hasOwn(p.circuits, root))
    throw new Error("Unknown circuit: " + root);
  phase = "execution";
  if (command === "course-check") {
    if ([...options.keys()].some((k) => k !== "--json"))
      throw new Error("course-check supports only --json");
    if (!p.course) throw new Error("Not a course project");
    const results = await reverifyCourse(p);
    const active = await checkCourse(p, p.course.active);
    results.push(active);
    process.stdout.write(canonical({ course: p.course.id, results }) + "\n");
    return results.every((r) => r.status === "passed") ? 0 : 1;
  }
  const diagnostics = compile(p, root).diagnostics;
  if (command === "validate") {
    process.stdout.write(
      canonical({
        valid: !diagnostics.some((d) => d.severity === "error"),
        diagnostics,
      }) + "\n",
    );
    return diagnostics.some((d) => d.severity === "error") ? 2 : 0;
  }
  const c = p.circuits[root],
    cases = c.tests.length ? c.tests : vectorCases(p, c);
  const results = runCases(p, root, cases),
    report = { schemaVersion: 1, circuit: root, results };
  if (options.has("--json")) process.stdout.write(canonical(report) + "\n");
  else
    for (const r of results)
      process.stdout.write(
        `${r.status.toUpperCase()} ${r.name} (${r.cycles} cycles)\n`,
      );
  if (!cases.length) {
    process.stderr.write("No test cases found in selected circuit.\n");
    return 2;
  }
  if (options.has("--report")) {
    const dir = resolve(options.get("--report")!);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, "results.json"), canonical(report) + "\n");
    const escape = (s: string) =>
      s.replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]!,
      );
    await writeFile(
      resolve(dir, "index.html"),
      `<!doctype html><meta charset="utf-8"><title>Loom test report</title><h1>Loom test report</h1><pre>${escape(JSON.stringify(report, null, 2))}</pre>`,
    );
  }
  for (const r of results)
    if (r.error) process.stderr.write(`${r.name}: ${r.error}\n`);
  return reportCode(results);
}
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(
      (error instanceof Error ? error.message : String(error)) + "\n",
    );
    process.exitCode = phase === "execution" ? 3 : 2;
  });
