export function parseId(value: string | string[]): number {
  const id = Array.isArray(value) ? value[0] : value;
  return parseInt(id, 10);
}
