import { useState } from "react";
import {
  uid,
  type Circuit,
  type Project,
  type Net,
  type Endpoint,
} from "../model/types";
import { attachNet, endpointKey, portAt } from "../model/nets";
import { ports, pinNormal, pinPosition } from "../model/components";
export function makeMarker(c: Circuit, p: Project, n: Net, e: Endpoint) {
  if (
    c.markers.some(
      (m) =>
        m.netId === n.id &&
        m.endpoint &&
        endpointKey(m.endpoint) === endpointKey(e),
    )
  )
    return;
  const component = c.components.find((c) => c.id === e.component)!;
  const at = pinPosition(component, e.port, p),
    normal = pinNormal(component, e.port, p);
  c.markers.push({
    id: uid(),
    netId: n.id,
    endpoint: { ...e },
    x: at.x + normal.x * 100 - (normal.x < 0 ? 100 : 0),
    y: at.y + normal.y * 60 - 10,
    rotation: 0,
  });
  c.wires = c.wires.filter(
    (w) => !(w.netId === n.id && endpointKey(w.to) === endpointKey(e)),
  );
}
export default function NetInspector({
  net,
  circuit,
  project,
  edit,
  t,
}: {
  net: Net;
  circuit: Circuit;
  project: Project;
  edit: (fn: (p: Project) => void) => boolean;
  t: (s: string) => string;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="net-inspector">
      <h3>
        {t("net")} · {net.width}b
      </h3>
      <label>
        {t("netName")}
        <input
          aria-label={t("netName")}
          maxLength={200}
          value={net.name ?? ""}
          onChange={(e) =>
            edit((p) => {
              p.circuits[circuit.id].nets.find((n) => n.id === net.id)!.name =
                e.target.value;
            })
          }
        />
      </label>
      <div className="net-members">
        {net.ports.map((e) => (
          <div key={endpointKey(e)}>
            <span>
              {circuit.components.find((c) => c.id === e.component)?.name}.
              {portAt(circuit, project, e)?.name ?? e.port}
            </span>
            <button
              aria-label={t("namedConnection") + " " + e.component}
              onClick={() =>
                edit((p) => {
                  const c = p.circuits[circuit.id],
                    n = c.nets.find((n) => n.id === net.id)!;
                  makeMarker(c, p, n, e);
                })
              }
            >
              {t("marker")}
            </button>
          </div>
        ))}
      </div>
      <label>
        {t("attachPort")}
        <select
          aria-label={t("attachPort")}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">{t("choosePort")}</option>
          {circuit.components.flatMap((c) =>
            ports(c, project)
              .filter((p) => p.width === net.width)
              .map((p) => (
                <option
                  key={c.id + p.id}
                  value={JSON.stringify({ component: c.id, port: p.id })}
                >
                  {c.name}.{p.name}
                </option>
              )),
          )}
        </select>
      </label>
      <button
        disabled={!selected}
        onClick={() =>
          edit((p) => {
            const c = p.circuits[circuit.id],
              e = JSON.parse(selected) as Endpoint;
            attachNet(c, p, net.id, e);
            makeMarker(
              c,
              p,
              c.nets.find((n) => n.id === net.id)!,
              e,
            );
          })
        }
      >
        {t("connectNamed")}
      </button>
      <button
        className="danger"
        onClick={() =>
          edit((p) => {
            const c = p.circuits[circuit.id];
            c.nets = c.nets.filter((n) => n.id !== net.id);
            c.wires = c.wires.filter((w) => w.netId !== net.id);
            c.markers = c.markers.filter((m) => m.netId !== net.id);
          })
        }
      >
        {t("deleteNet")}
      </button>
    </div>
  );
}
