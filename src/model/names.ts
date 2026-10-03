export const NAME_LIMIT = 200;

export function suffixedName(name: string, suffix: string) {
  return (
    name.slice(0, Math.max(0, NAME_LIMIT - suffix.length)) +
    suffix.slice(0, NAME_LIMIT)
  );
}
