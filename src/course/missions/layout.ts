import { layoutGateProject } from "../logic";
import { baseGeometry, pinNormal, pinPosition } from "../../model/components";
import { uid, type Project } from "../../model/types";

/** Dense reference designs use explicit named connections when drawn routes cannot fit. */
export function layoutMission(project: Project): Project {
  try {
    return layoutGateProject(project);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "routeBlocked")
      throw error;
  }
  for (const circuit of Object.values(project.circuits)) {
    if (circuit.library) continue;
    const height = Math.max(
      220,
      ...circuit.components.map((n) => baseGeometry(n, project).h + 160),
    );
    circuit.components.forEach((node, i) => {
      node.x = (i % 4) * 480;
      node.y = Math.floor(i / 4) * height;
    });
    circuit.markers = [];
    for (const net of circuit.nets) {
      const driver =
        net.ports.find((e) => {
          const c = circuit.components.find((n) => n.id === e.component)!;
          return pinNormal(c, e.port, project).x > 0;
        }) ?? net.ports[0];
      net.name = `${driver.component}.${driver.port}`;
      for (const endpoint of net.ports) {
        const node = circuit.components.find(
            (n) => n.id === endpoint.component,
          )!,
          at = pinPosition(node, endpoint.port, project),
          normal = pinNormal(node, endpoint.port, project);
        circuit.markers.push({
          id: uid(),
          netId: net.id,
          endpoint: { ...endpoint },
          x: at.x + normal.x * 100 - (normal.x < 0 ? 100 : 0),
          y: at.y + normal.y * 60 - 10,
          rotation: 0,
        });
      }
    }
    circuit.wires = [];
  }
  return project;
}
