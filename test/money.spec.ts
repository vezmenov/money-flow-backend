import { amountToCents, centsToAmount } from '../src/common/money';

describe('Money conversions (amount <-> cents)', () => {
  it('converts amount to cents for common values', () => {
    expect(amountToCents(0)).toBe(0);
    expect(amountToCents(0.01)).toBe(1);
    expect(amountToCents(10)).toBe(1000);
    expect(amountToCents(10.5)).toBe(1050);
    expect(amountToCents(9999999.99)).toBe(999999999);
  });

  it('converts cents back to amount', () => {
    expect(centsToAmount(0)).toBe(0);
    expect(centsToAmount(1)).toBe(0.01);
    expect(centsToAmount(1050)).toBe(10.5);
  });

  it('rejects non-finite values', () => {
    expect(() => amountToCents(Number.NaN)).toThrow();
    expect(() => amountToCents(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => centsToAmount(Number.NaN)).toThrow();
  });
});
