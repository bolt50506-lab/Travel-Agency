export const PORTAL_CURRENCY = 'PKR' as const;

export function toPkrAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('INVALID_PKR_AMOUNT');
  return Math.round(amount * 100) / 100;
}
