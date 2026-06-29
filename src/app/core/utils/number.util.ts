export function toNumber(value: unknown): number {
  const number = typeof value === 'string' && value.trim() === '' ? 0 : Number(value);
  return Number.isFinite(number) ? number : 0;
}
