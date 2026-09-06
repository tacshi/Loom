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
  | "buffer"
  | "keyboard"
  | "terminal"
  | "display";
export type SignalRef = {
  instancePath: string[];
  componentId: string;
  portId: string;
};
export type ParameterRef = { parameter: string };
export type ComponentAppearance = {
  rotation: 0 | 90 | 180 | 270;
  width?: number;
  height?: number;
  pins?: Record<
    string,
    { side: "left" | "right" | "top" | "bottom"; slot: number }
  >;
};
export type LibraryReference = { id: string; version: number; hash: string };
export type Net = {
  id: string;
  width: number;
  name?: string;
  ports: Endpoint[];
};
export type NetMarker = {
  id: string;
  netId: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  endpoint?: Endpoint;
};
export type TestStep = {
  memory?: { ref: SignalRef; address: number; value: number; known?: number }[];
  inputs?: { ref: SignalRef; value: number }[];
  keyboard?: { component: SignalRef; text: string }[];
  cycles: number;
  assertions: TestAssertion[];
};
export type TestAssertion =
  | { type: "signal"; ref: SignalRef; value: number; known?: number }
  | {
      type: "memory";
      ref: SignalRef;
      address: number;
      value: number;
      known?: number;
    }
  | { type: "terminal"; ref: SignalRef; text: string }
  | { type: "pixel"; ref: SignalRef; x: number; y: number; value: number };
export type TestCase = {
  id: string;
  name: string;
  steps: TestStep[];
  maxCycles: number;
  seed: number;
};
export type Parameter = {
  name: string;
  default: number;
  min: number;
  max: number;
};
export type DebugProfile = {
  pc: SignalRef;
  instructionBoundary: { ref: SignalRef; value: number };
  halt: SignalRef;
  invalid?: SignalRef;
  program: SignalRef;
  registers: { label: string; ref: SignalRef }[];
};
export type Port = {
  id: string;
  name: string;
  direction: "in" | "out";
  width: number;
  widthParameter?: string;
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
  appearance?: ComponentAppearance;
  widthParameter?: string;
  addressParameter?: string;
  arguments?: Record<string, number>;
};
export type Endpoint = { component: string; port: string };
export type Route = {
  id: string;
  from: Endpoint;
  to: Endpoint;
  points: Point[];
  netId?: string;
  pinned?: boolean;
  junction?: Point;
};
export type Wire = Route;
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
  wires: Route[];
  nets: Net[];
  markers: NetMarker[];
  tests: TestCase[];
  appearance?: ComponentAppearance;
  parameters?: Parameter[];
  library?: LibraryReference;
  libraryOrigin?: LibraryReference;
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
  schemaVersion: 2;
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
  debugProfile?: DebugProfile;
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
    schemaVersion: 2,
    id: uid(),
    name,
    root,
    circuits: {
      [root]: {
        id: root,
        name: "Main",
        components: [],
        wires: [],
        nets: [],
        markers: [],
        tests: [],
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
