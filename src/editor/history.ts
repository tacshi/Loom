type BudgetEntry = { bytes: number; evict: () => void };

/** Shared across mission stacks so visiting more missions cannot grow undo indefinitely. */
export class HistoryBudget {
  private entries = new Set<BudgetEntry>();
  bytes = 0;
  constructor(readonly limit = 64 * 1024 * 1024) {}
  retain(entry: BudgetEntry) {
    this.entries.add(entry);
    this.bytes += entry.bytes;
    while (this.bytes > this.limit && this.entries.size) {
      const oldest = this.entries.values().next().value!;
      this.release(oldest);
      oldest.evict();
    }
  }
  release(entry: BudgetEntry) {
    if (this.entries.delete(entry)) this.bytes -= entry.bytes;
  }
}

type Entry<T> = BudgetEntry & { value: T };
export class History<T> {
  private past: Entry<T>[] = [];
  private future: Entry<T>[] = [];
  private group?: string;
  constructor(
    private limit = 100,
    private budget = new HistoryBudget(),
  ) {}
  private discard(entries: Entry<T>[]) {
    for (const entry of entries) this.budget.release(entry);
    entries.length = 0;
  }
  private record(value: T, entries: Entry<T>[]) {
    const copy = structuredClone(value);
    const entry: Entry<T> = {
      value: copy,
      bytes: JSON.stringify(copy).length * 2,
      evict: () => {
        const index = entries.indexOf(entry);
        if (index !== -1) entries.splice(index, 1);
        if (!this.past.length) this.group = undefined;
      },
    };
    entries.push(entry);
    this.budget.retain(entry);
    while (entries.length > this.limit) this.budget.release(entries.shift()!);
  }
  /** Consecutive edits to one field share an undo step until blur or another edit. */
  push(value: T, group?: string) {
    this.discard(this.future);
    if (group !== undefined && group === this.group) return;
    this.group = group;
    this.record(value, this.past);
  }
  seal() {
    this.group = undefined;
  }
  undo(current: T): T | undefined {
    this.group = undefined;
    const entry = this.past.pop();
    if (!entry) return;
    this.budget.release(entry);
    this.record(current, this.future);
    return entry.value;
  }
  redo(current: T): T | undefined {
    this.group = undefined;
    const entry = this.future.pop();
    if (!entry) return;
    this.budget.release(entry);
    this.record(current, this.past);
    return entry.value;
  }
  clear() {
    this.discard(this.past);
    this.discard(this.future);
    this.group = undefined;
  }
  get canUndo() {
    return !!this.past.length;
  }
  get canRedo() {
    return !!this.future.length;
  }
}
