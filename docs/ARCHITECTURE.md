# Architecture

## Boundaries

- `model`: versioned circuit graph, stable component/port identities, extraction, interface-safe deletion, and replacement checks.
- `editor`: undo snapshots, orthogonal routing, endpoint clearance, overlap avoidance, bridge/junction analysis.
- `simulator`: pure compiler/engine, unsigned known-bit masks, synchronous state commits, worker protocol and UI subscriptions.
- `persistence`: IndexedDB transactions, snapshots, file validation, single-writer Web Locks.
- `cpu`, `examples`, `learning`: ordinary circuit definitions, assembler, and bilingual checkpoints.
- `ui`: React DOM controls and layered Konva rendering. Selection, wires, and components draw separately.

## Electrical model

Connectivity is stored as directed endpoint connections. Fan-out connections sharing an output form one electrical net; route points never define connectivity. A geometric crossing only creates a junction when the connections share that source. Different sources use bridge arcs.

Compilation expands subcircuits into scoped instance paths, validates wiring and hierarchy, and topologically orders combinational evaluation. Storage input edges are excluded from combinational dependencies; RAM's address remains a combinational dependency because reads are asynchronous. Width mismatches, multiple drivers, and combinational cycles prevent execution.

Each signal stores an unsigned value and known-bit mask for widths 1–32. Controlling AND/OR inputs can resolve output bits even when another input is unknown. Arithmetic conservatively propagates unknowns.

A clock step settles logic, samples all storage, commits it together, and settles again. Registers use synchronous reset with priority over enable. RAM reads are asynchronous; writes commit on a rising edge. Uncertain RAM writes conservatively invalidate possible destinations. Reset clears RAM, retains ROM, and applies register initial values.

Memory allocation is capped at 1,048,576 words across expanded instances, and recursive/oversized circuits are rejected before allocating runtime state.

## State and worker lifecycle

Document state and simulator state are separate. The compilation signature excludes names and positions, so layout/name edits preserve runtime state. Topology, widths, definitions, and ROM changes create a new worker session and reset runtime state. Input changes update values without resetting storage. Replies carry session/revision identities; stale replies and superseded test requests are discarded.

Execution yields in bounded batches, with display updates independent of clock rate. A watchdog terminates an unresponsive worker and exposes restart. Traces are bounded in both worker and UI. Circuit tests run in isolated engine instances and do not change the visible runtime's RAM/register state.

## Persistence

Loom is unreleased. Only the current project format (schema 2) is accepted; incompatible development formats are rejected without rewriting them or replacing the open document. Development iterations, including v3, do not require compatibility migrations. Database creation and each save are transactional. A save retains up to eight ordinary recovery snapshots. Recovery/import create new project identities.

Only a tab holding the project's Web Lock can write. The project-switch transition remains non-editable until ownership is established. Save status is derived from the current document and the last committed serialized document, rather than merely from a scheduled save.

## Rendering

Circuit-space geometry uses a shared grid. Snapping thresholds are measured in screen pixels. Routing preserves manual constraints, uses an obstacle-aware grid search with bend/crossing costs, and prohibits overlap with different signals where an automatic route can be found. Explicit rerouting never changes electrical endpoints.

Crossing lookup uses a sorted vertical-segment index. Dense component glyphs and pan surfaces are cached; selection is an independent overlay. Canvas text is single-line, and editable text remains in native DOM fields.

The optional `run_circuit_tests` WebMCP tool invokes the same visible test workflow. It does not edit the project and validates its empty input schema.
