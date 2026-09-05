export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  constructor(private limit = 100) {}
  push(value: T) {
    this.past.push(structuredClone(value));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(current: T): T | undefined {
    const result = this.past.pop();
    if (result) {
      this.future.push(structuredClone(current));
    }
    return result;
  }
  redo(current: T): T | undefined {
    const result = this.future.pop();
    if (result) this.past.push(structuredClone(current));
    return result;
  }
  clear() {
    this.past = [];
    this.future = [];
  }
  get canUndo() {
    return !!this.past.length;
  }
  get canRedo() {
    return !!this.future.length;
  }
}
