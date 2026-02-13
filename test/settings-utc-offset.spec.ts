import { normalizeUtcOffset, parseUtcOffsetMinutes } from '../src/settings/settings.service';

describe('Settings utcOffset parsing', () => {
  it('normalizes various accepted formats to +HH:MM', () => {
    expect(normalizeUtcOffset('UTC+3')).toBe('+03:00');
    expect(normalizeUtcOffset(' +3 ')).toBe('+03:00');
    expect(normalizeUtcOffset('+03:00')).toBe('+03:00');
    expect(normalizeUtcOffset('UTC-5')).toBe('-05:00');
    expect(normalizeUtcOffset('-5')).toBe('-05:00');
    expect(normalizeUtcOffset('+0530')).toBe('+05:30');
    expect(normalizeUtcOffset('UTC+03:30')).toBe('+03:30');
  });

  it('parses utcOffset minutes correctly', () => {
    expect(parseUtcOffsetMinutes('+03:00')).toBe(180);
    expect(parseUtcOffsetMinutes('-05:30')).toBe(-330);
    expect(parseUtcOffsetMinutes('UTC+3')).toBe(180);
  });

  it('rejects invalid utcOffset values', () => {
    expect(() => normalizeUtcOffset('')).toThrow();
    expect(() => normalizeUtcOffset('UTC')).toThrow();
    expect(() => normalizeUtcOffset('foo')).toThrow();
    expect(() => normalizeUtcOffset('+15:00')).toThrow();
    expect(() => normalizeUtcOffset('+14:01')).toThrow();
    expect(() => normalizeUtcOffset('+03:60')).toThrow();
  });
});
