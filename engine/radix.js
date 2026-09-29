// Non-negative integers in any base from 2 to 36, on BigInt. Digits are upper case.
// Functions accept a bigint or a safe integer number.

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBig(value) {
  if (typeof value === 'bigint') return value;
  if (Number.isSafeInteger(value)) return BigInt(value);
  throw new TypeError(`expected an integer, got ${value}`);
}

function checkBase(base) {
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new RangeError(`base must be an integer from 2 to 36, got ${base}`);
  }
}

function toNonNegative(value) {
  const n = toBig(value);
  if (n < 0n) throw new RangeError(`expected a non-negative integer, got ${n}`);
  return n;
}

/** Text of `value` in `base`, left-padded with zeros to `width` (0 = no padding). */
export function toBase(value, base, width = 0) {
  checkBase(base);
  const text = toNonNegative(value).toString(base).toUpperCase();
  if (width > 0 && text.length > width) {
    throw new RangeError(`${text} does not fit in ${width} digits`);
  }
  return text.padStart(width, '0');
}

/** Value of `text` in `base`, as a BigInt. */
export function fromBase(text, base) {
  checkBase(base);
  const s = String(text).toUpperCase();
  if (s === '') throw new SyntaxError('fromBase: empty text');
  let value = 0n;
  for (const c of s) {
    const digit = DIGITS.indexOf(c);
    if (digit === -1 || digit >= base) throw new SyntaxError(`fromBase: "${c}" is not a base ${base} digit`);
    value = value * BigInt(base) + BigInt(digit);
  }
  return value;
}

export const toBinary = (value, width = 0) => toBase(value, 2, width);
export const fromBinary = (text) => fromBase(text, 2);

/** Number of 1 bits. */
export function popcount(value) {
  return [...toNonNegative(value).toString(2)].filter((c) => c === '1').length;
}

/** Number of bits needed to write the value (0 for 0). */
export function bitLength(value) {
  const n = toNonNegative(value);
  return n === 0n ? 0 : n.toString(2).length;
}
