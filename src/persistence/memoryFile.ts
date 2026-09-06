export function decodeMemory(
  data: Uint8Array | string,
  width: number,
  start: number,
  capacity: number,
  endian: "little" | "big" = "little",
): number[] {
  if (
    !Number.isInteger(width) ||
    width < 1 ||
    width > 32 ||
    !Number.isInteger(start) ||
    start < 0 ||
    start >= capacity
  )
    throw new Error("invalidMemoryImage");
  const max = 2 ** width - 1;
  let words: number[];
  if (typeof data === "string") {
    const tokens = data
      .replace(/;[^\n]*/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.some((s) => !/^(?:0x)?[0-9a-f]+$/i.test(s)))
      throw new Error("invalidMemoryImage");
    words = tokens.map((s) => parseInt(s, 16));
  } else {
    const bytes = Math.ceil(width / 8);
    if (data.length % bytes) throw new Error("invalidMemoryImage");
    words = [];
    for (let i = 0; i < data.length; i += bytes) {
      let n = 0;
      for (let j = 0; j < bytes; j++)
        n += data[i + j] * 2 ** (8 * (endian === "little" ? j : bytes - 1 - j));
      words.push(n);
    }
  }
  if (
    words.length + start > capacity ||
    words.some((n) => !Number.isInteger(n) || n < 0 || n > max)
  )
    throw new Error("invalidMemoryImage");
  return words;
}
export function encodeMemory(
  words: number[],
  width: number,
  endian: "little" | "big" = "little",
) {
  if (words.some((n) => !Number.isInteger(n) || n < 0 || n > 2 ** width - 1))
    throw new Error("unknownMemoryExport");
  const bytes = Math.ceil(width / 8),
    out = new Uint8Array(words.length * bytes);
  words.forEach((n, i) => {
    for (let j = 0; j < bytes; j++)
      out[i * bytes + j] =
        Math.floor(n / 2 ** (8 * (endian === "little" ? j : bytes - 1 - j))) &
        255;
  });
  return out;
}
