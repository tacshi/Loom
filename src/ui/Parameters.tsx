import { validParameterDefinition } from "../model/parameters";
import { useState } from "react";
import type { Circuit, Project, Component, Parameter } from "../model/types";
export function ParameterDefinitions({
  circuit,
  apply,
  t,
}: {
  circuit: Circuit;
  apply: (values: Parameter[]) => boolean;
  t: (s: string) => string;
}) {
  const [name, setName] = useState("width"),
    [value, setValue] = useState(8),
    [min, setMin] = useState(1),
    [max, setMax] = useState(32);
  return (
    <details className="parameter-editor">
      <summary>{t("parameters")}</summary>
      {(circuit.parameters ?? []).map((p) => (
        <p key={p.name}>
          {p.name} = {p.default} [{p.min}–{p.max}]
          <button
            aria-label={t("delete") + " " + p.name}
            onClick={() =>
              apply((circuit.parameters ?? []).filter((q) => q !== p))
            }
          >
            ×
          </button>
        </p>
      ))}
      <label>
        {t("parameterName")}
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="parameter-fields">
        {[
          [t("defaultValue"), value, setValue],
          [t("minimum"), min, setMin],
          [t("maximum"), max, setMax],
        ].map(([label, n, set]) => (
          <label key={label as string}>
            {label as string}
            <input
              type="number"
              min={1}
              max={32}
              value={n as number}
              onChange={(e) =>
                (set as (v: number) => void)(Number(e.target.value))
              }
            />
          </label>
        ))}
      </div>
      <button
        disabled={
          !validParameterDefinition({ name, min, max, default: value }) ||
          (circuit.parameters ?? []).some((p) => p.name === name)
        }
        onClick={() =>
          apply([
            ...(circuit.parameters ?? []),
            { name, default: value, min, max },
          ])
        }
      >
        {t("addParameter")}
      </button>
    </details>
  );
}
export function InstanceParameters({
  component,
  project,
  apply,
  t,
}: {
  component: Component;
  project: Project;
  apply: (args: Record<string, number>) => boolean;
  t: (s: string) => string;
}) {
  const def = project.circuits[component.definitionId!];
  if (!def?.parameters?.length) return null;
  return (
    <div className="appearance-editor">
      {def.parameters.map((p) => (
        <label key={p.name}>
          {p.name} ({p.min}–{p.max})
          <input
            type="number"
            min={p.min}
            max={p.max}
            value={component.arguments?.[p.name] ?? p.default}
            onChange={(e) =>
              apply({
                ...component.arguments,
                [p.name]: Number(e.target.value),
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
