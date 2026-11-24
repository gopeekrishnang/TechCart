// All money is integer minor units (cents/paise). Never use floats for amounts.

export const COMMISSION_BPS = Number(process.env.COMMISSION_BPS ?? 800); // 8.00%

export function commissionMinor(subtotalMinor: number, bps = COMMISSION_BPS): number {
  if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) {
    throw new RangeError("subtotalMinor must be a non-negative integer");
  }
  return Math.round((subtotalMinor * bps) / 10_000);
}

export function sellerPayoutMinor(subtotalMinor: number, bps = COMMISSION_BPS): number {
  return subtotalMinor - commissionMinor(subtotalMinor, bps);
}

export function formatMoney(amountMinor: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}
