export function amountToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error('amount must be a finite number');
  }

  // Validation already enforces 2 decimal places, but avoid float math anyway.
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  const s = abs.toString();

  // Fallback for unlikely scientific notation.
  if (s.includes('e') || s.includes('E')) {
    return Math.round(amount * 100);
  }

  const [wholeStr, fracStrRaw = ''] = s.split('.');
  const whole = Number(wholeStr);
  const frac = Number(fracStrRaw.padEnd(2, '0').slice(0, 2));

  if (!Number.isInteger(whole) || !Number.isInteger(frac)) {
    throw new Error('amount is invalid');
  }

  return sign * (whole * 100 + frac);
}

export function centsToAmount(cents: number): number {
  if (!Number.isFinite(cents)) {
    throw new Error('amountCents must be a finite number');
  }
  return Number(cents) / 100;
}
