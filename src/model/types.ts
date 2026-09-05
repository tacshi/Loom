export type Point = { x: number; y: number };
export type Kind =
  | "input"
  | "constant"
  | "probe"
  | "not"
  | "and"
  | "or"
  | "xor"
  | "nand"
  | "nor"
  | "xnor"
  | "mux"
  | "decoder"
  | "split"
  | "join"
  | "adder"
  | "subtractor"
  | "compare"
  | "register"
  | "counter"
  | "dff"
  | "ram"
  | "rom"
  | "portIn"
  | "portOut"
  | "instance"
  | "buffer";
export type Port = {
  id: string;
  name: string;
  direction: "in" | "out";
  width: number;
};
export type Component = {
  id: string;
  kind: Kind;
  name: string;
  x: number;
  y: number;
  width: number;
  params: Record<string, number>;
  definitionId?: string;
  image?: number[];
};
export type Endpoint = { component: string; port: string };
export type Wire = {
  id: string;
  from: Endpoint;
  to: Endpoint;
  points: Point[];
  pinned?: boolean;
  junction?: Point;
};
export type TestVector = {
  name: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  cycles?: number;
};
export type Circuit = {
  id: string;
  name: string;
  components: Component[];
  wires: Wire[];
  ports: (Port & { componentId: string })[];
  vectors: TestVector[];
};
export type CpuBinding = {
  pc: string;
  ir: string;
  accumulator: string;
  zero: string;
  carry: string;
  phase: string;
  halt: string;
  output: string;
  rom: string;
  ram: string;
  invalid: string;
};
export type Project = {
  schemaVersion: 1;
  id: string;
  name: string;
  root: string;
  circuits: Record<string, Circuit>;
  source: string;
  checkpoint?: string;
  assembledSource?: string;
  progress: string[];
  updatedAt: number;
  cpu?: CpuBinding;
  sourceMap?: Record<number, number>;
};
export type Diagnostic = {
  code: string;
  severity: "error" | "warning";
  component?: string;
  port?: string;
  args?: Record<string, string | number>;
};
export const GRID = 20;
export const uid = () => crypto.randomUUID();
export const snap = (n: number) => Math.round(n / GRID) * GRID;
export function emptyProject(name = "Untitled circuit"): Project {
  const root = uid();
  return {
    schemaVersion: 1,
    id: uid(),
    name,
    root,
    circuits: {
      [root]: {
        id: root,
        name: "Main",
        components: [],
        wires: [],
        ports: [],
        vectors: [],
      },
    },
    source: "",
    progress: [],
    updatedAt: Date.now(),
  };
}
export function createComponent(
  kind: Kind,
  x: number,
  y: number,
  width = 1,
): Component {
  return {
    id: uid(),
    kind,
    name: kind.toUpperCase(),
    x: snap(x),
    y: snap(y),
    width,
    params: { value: 0, initial: 0, addressBits: 8 },
  };
}
