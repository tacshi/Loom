import type { Component, Project } from "../model/types";
import { messages, type Language } from "./i18n";
import { subcircuitLabel } from "./subcircuitLabel";

export function componentLabel(
  component: Component,
  project: Project,
  lang: Language,
) {
  if (component.kind === "instance") {
    const definition = project.circuits[component.definitionId!];
    if (
      definition?.library?.id.startsWith("course-core-") &&
      [
        definition.name,
        subcircuitLabel(definition, "en"),
        subcircuitLabel(definition, "zh"),
      ].includes(component.name)
    )
      return subcircuitLabel(definition, lang);
    return component.name;
  }
  const defaults = messages[component.kind];
  if (
    defaults &&
    [component.kind.toUpperCase(), ...defaults].includes(component.name)
  )
    return defaults[lang === "zh" ? 1 : 0];
  return component.name;
}
