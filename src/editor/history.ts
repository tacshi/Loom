export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private group?: string;
  constructor(private limit = 100) {}
  /**
   * Records the state before an edit. Consecutive pushes with the same group
   * (for example, keystrokes in one text field) form a single undo step until
   * the group is sealed or another edit intervenes.
   */
  push(value: T, group?: string) {
    this.future = [];
    if (group !== undefined && group === this.group) return;
    this.group = group;
    this.past.push(structuredClone(value));
    if (this.past.length > this.limit) this.past.shift();
  }
  /** Ends the current edit group so the next push starts a new undo step. */
  seal() {
    this.group = undefined;
  }
  undo(current: T): T | undefined {
    this.group = undefined;
    const result = this.past.pop();
    if (result) {
      this.future.push(structuredClone(current));
    }
    return result;
  }
  redo(current: T): T | undefined {
    this.group = undefined;
    const result = this.future.pop();
    if (result) this.past.push(structuredClone(current));
    return result;
  }
  clear() {
    this.past = [];
    this.future = [];
    this.group = undefined;
  }
  get canUndo() {
    return !!this.past.length;
  }
  get canRedo() {
    return !!this.future.length;
  }
}
