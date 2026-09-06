import {
  uid,
  createComponent,
  type Project,
  type Endpoint,
  type Port,
  type Circuit,
} from "./types";
import { deriveNets, electricalWires, removeRouteConnection } from "./nets";
import { ports, pinPosition } from "./components";
import { orthogonal, protectTerminals, route } from "../editor/routing";
export function extract(
  project: Project,
  circuitId: string,
  selection: string[],
  name: string,
  routeLayout = true,
): string {
  project.circuits[circuitId].wires = electricalWires(
    project.circuits[circuitId],
    project,
  );
  const parent = project.circuits[circuitId],
    selected = parent.components.filter(
      (c) =>
        selection.includes(c.id) && c.kind !== "portIn" && c.kind !== "portOut",
    );
  selection = selected.map((c) => c.id);
  if (!selected.length) throw new Error("selectComponents");
  const id = uid(),
    instanceId = uid(),
    minX = Math.min(...selected.map((c) => c.x)),
    minY = Math.min(...selected.map((c) => c.y));
  const definition: Circuit = {
    id,
    name,
    components: structuredClone(selected),
    wires: parent.wires
      .filter(
        (w) =>
          selection.includes(w.from.component) &&
          selection.includes(w.to.component),
      )
      .map((w) => structuredClone(w)),
    nets: [],
    markers: [],
    tests: [],
    ports: [],
    vectors: [],
  };
  project.circuits[id] = definition;
  for (const c of definition.components) {
    c.x -= minX - 200;
    c.y -= minY - 60;
  }
  for (const w of definition.wires)
    w.points = w.points.map((p) => ({
      x: p.x - minX + 200,
      y: p.y - minY + 60,
    }));
  const outputX = Math.max(...definition.components.map((c) => c.x)) + 200;
  const external = parent.wires.filter(
    (w) =>
      selection.includes(w.from.component) !==
      selection.includes(w.to.component),
  );
  const mapping = new Map<string, { id: string; componentId: string }>();
  function expose(
    input: boolean,
    endpoint: Endpoint,
    group: string,
    label: string,
  ) {
    let mapped = mapping.get(group);
    if (!mapped) {
      const c = selected.find((c) => c.id === endpoint.component)!,
        port = ports(c, project).find((p) => p.id === endpoint.port)!;
      const n = definition.ports.filter(
        (p) => p.direction === (input ? "in" : "out"),
      ).length;
      const pc = createComponent(
        input ? "portIn" : "portOut",
        input ? 0 : outputX,
        60 + n * 100,
        port.width,
      );
      pc.name = label;
      definition.components.push(pc);
      const p: Port & { componentId: string } = {
        id: uid(),
        name: label,
        direction: input ? "in" : "out",
        width: port.width,
        componentId: pc.id,
      };
      definition.ports.push(p);
      mapped = { id: p.id, componentId: pc.id };
      mapping.set(group, mapped);
    }
    const from: Endpoint = input
        ? { component: mapped.componentId, port: "out" }
        : endpoint,
      to: Endpoint = input
        ? endpoint
        : { component: mapped.componentId, port: "in" };
    if (
      !definition.wires.some(
        (w) =>
          w.from.component === from.component &&
          w.from.port === from.port &&
          w.to.component === to.component &&
          w.to.port === to.port,
      )
    )
      definition.wires.push({
        id: uid(),
        from: { ...from },
        to: { ...to },
        points: protectTerminals(
          orthogonal(
            pinPosition(
              definition.components.find((c) => c.id === from.component)!,
              from.port,
              project,
            ),
            pinPosition(
              definition.components.find((c) => c.id === to.component)!,
              to.port,
              project,
            ),
          ),
        ),
      });
    return mapped.id;
  }
  for (const w of external) {
    const input = selection.includes(w.to.component),
      endpoint = input ? w.to : w.from;
    const key = (input ? "in:" : "out:") + w.from.component + ":" + w.from.port;
    const source = parent.components.find((c) => c.id === w.from.component)!;
    const portId = expose(input, endpoint, key, source.name);
    if (input) w.to = { component: instanceId, port: portId };
    else w.from = { component: instanceId, port: portId };
  }
  // Unconnected boundary pins remain available on the packaged component.
  for (const c of selected)
    for (const p of ports(c, project)) {
      const input = p.direction === "in";
      const used = definition.wires.some((w) =>
        input
          ? w.to.component === c.id && w.to.port === p.id
          : w.from.component === c.id && w.from.port === p.id,
      );
      if (!used)
        expose(
          input,
          { component: c.id, port: p.id },
          p.direction + ":" + c.id + ":" + p.id,
          c.name + "." + p.name,
        );
    }
  parent.components = parent.components.filter(
    (c) => !selection.includes(c.id),
  );
  parent.wires = parent.wires.filter(
    (w) =>
      !selection.includes(w.from.component) &&
      !selection.includes(w.to.component),
  );
  const instance = createComponent("instance", minX, minY);
  instance.id = instanceId;
  instance.name = name;
  instance.definitionId = id;
  parent.components.push(instance);
  const seen = new Set<string>();
  parent.wires = parent.wires.filter((w) => {
    const k = JSON.stringify([w.from, w.to]);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const affected = parent.wires.filter(
    (w) => w.from.component === instanceId || w.to.component === instanceId,
  );
  for (const w of affected) w.points = [];
  for (const w of affected) {
    try {
      if (!routeLayout) throw new Error("layout");
      w.points = route(parent, project, w.from, w.to);
    } catch (error) {
      if (routeLayout) throw error;
      w.points = protectTerminals(
        orthogonal(
          pinPosition(
            parent.components.find((c) => c.id === w.from.component)!,
            w.from.port,
            project,
          ),
          pinPosition(
            parent.components.find((c) => c.id === w.to.component)!,
            w.to.port,
            project,
          ),
        ),
      );
    }
  }
  definition.nets = deriveNets(definition, project);
  parent.nets = deriveNets(parent, project);
  return instanceId;
}

export function removeSelection(
  project: Project,
  circuitId: string,
  selection: string[],
) {
  const circuit = project.circuits[circuitId];
  circuit.nets = circuit.nets.filter((n) => !selection.includes(n.id));
  circuit.wires = circuit.wires.filter(
    (w) => !w.netId || circuit.nets.some((n) => n.id === w.netId),
  );
  circuit.markers = circuit.markers.filter(
    (m) =>
      !selection.includes(m.id) && circuit.nets.some((n) => n.id === m.netId),
  );
  for (const id of selection) removeRouteConnection(circuit, id);
  const removedPorts = new Set(
    circuit.ports
      .filter((p) => selection.includes(p.componentId))
      .map((p) => p.id),
  );
  circuit.ports = circuit.ports.filter((p) => !removedPorts.has(p.id));
  for (const net of circuit.nets)
    net.ports = net.ports.filter((e) => !selection.includes(e.component));
  circuit.components = circuit.components.filter(
    (c) => !selection.includes(c.id),
  );
  circuit.wires = circuit.wires.filter(
    (w) =>
      !selection.includes(w.id) &&
      !selection.includes(w.from.component) &&
      !selection.includes(w.to.component),
  );
  if (removedPorts.size)
    for (const parent of Object.values(project.circuits)) {
      const instances = new Set(
        parent.components
          .filter((c) => c.definitionId === circuitId)
          .map((c) => c.id),
      );
      for (const net of parent.nets)
        net.ports = net.ports.filter(
          (e) => !(instances.has(e.component) && removedPorts.has(e.port)),
        );
      parent.wires = parent.wires.filter(
        (w) =>
          !(instances.has(w.from.component) && removedPorts.has(w.from.port)) &&
          !(instances.has(w.to.component) && removedPorts.has(w.to.port)),
      );
    }
}
