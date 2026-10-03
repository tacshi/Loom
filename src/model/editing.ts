import type { Project } from "./types";

export function componentWidthLimit(kind: string) {
  return kind === "decoder"
    ? 5
    : kind === "button" || kind === "sevenSegment"
      ? 1
      : 32;
}

export function setComponentWidth(
  project: Project,
  circuitId: string,
  id: string,
  width: number,
) {
  const circuit = project.circuits[circuitId];
  const component = circuit.components.find((n) => n.id === id);
  if (!component) throw new Error("missingPort");
  if (
    !Number.isInteger(width) ||
    width < 1 ||
    width > componentWidthLimit(component.kind)
  )
    throw new Error("widthMismatch");
  if (component.image?.some((word) => word > 2 ** width - 1))
    throw new Error("memoryWidthRange");
  component.width = width;
  const port = circuit.ports.find((p) => p.componentId === id);
  if (port) port.width = width;
}

export function writeRomWord(
  project: Project,
  circuitId: string,
  id: string,
  address: number,
  value: number,
) {
  const component = project.circuits[circuitId].components.find(
    (n) => n.id === id,
  );
  if (
    !component ||
    component.kind !== "rom" ||
    !Number.isInteger(address) ||
    address < 0 ||
    address >= 2 ** (component.params.addressBits ?? 8)
  )
    throw new Error("invalidMemoryAddress");
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** component.width)
    throw new Error("invalidMemoryWord");
  component.image = Array.from(
    { length: Math.max(address + 1, component.image?.length ?? 0) },
    (_, i) => component.image?.[i] ?? 0,
  );
  component.image[address] = value;
}
