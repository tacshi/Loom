// Test-only independent instruction oracle. Never import this from application code.
export class Oracle {
  a = 0;
  pc = 0;
  z = 0;
  c = 0;
  out = 0;
  halt = false;
  ram = new Uint8Array(256);
  constructor(public rom: number[]) {}
  step() {
    const word = this.rom[this.pc] ?? 0,
      op = word >>> 8,
      n = word & 255;
    this.pc = (this.pc + 1) & 255;
    const old = this.a;
    switch (op) {
      case 0:
        break;
      case 1:
        this.a = n;
        break;
      case 2:
        this.a = this.ram[n];
        break;
      case 3:
        this.ram[n] = this.a;
        break;
      case 4:
        this.a = (old + this.ram[n]) & 255;
        this.c = Number(old + this.ram[n] > 255);
        break;
      case 5:
        this.a = (old - this.ram[n]) & 255;
        this.c = Number(old >= this.ram[n]);
        break;
      case 6:
        this.a &= this.ram[n];
        break;
      case 7:
        this.a |= this.ram[n];
        break;
      case 8:
        this.a ^= this.ram[n];
        break;
      case 9:
        this.pc = n;
        break;
      case 10:
        if (this.z) this.pc = n;
        break;
      case 11:
        if (this.c) this.pc = n;
        break;
      case 12:
        this.out = this.a;
        break;
      default:
        this.halt = true;
    }
    if ([1, 2, 4, 5, 6, 7, 8].includes(op)) this.z = Number(this.a === 0);
  }
}
