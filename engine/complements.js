// Signed integers as bit strings: sign and magnitude, one's complement and two's
// complement, on any width from 2 to 64 bits. Values that do not fit are refused
// with a RangeError, never wrapped around.

import { fromBinary, toBinary } from './radix.js';

function toBig(value) {
  if (typeof value === 'bigint') return value;
  if (Number.isSafeInteger(value)) return BigInt(value);
  throw new TypeError(`expected an integer, got ${value}`);
}

function checkWidth(width) {
  if (!Number.isInteger(width) || width < 2 || width > 64) {
    throw new RangeError(`width must be an integer from 2 to 64, got ${width}`);
  }
  return BigInt(width);
}

/** Sign bit, then the magnitude on width-1 bits. Range: -(2^(w-1) - 1) .. 2^(w-1) - 1. */
export function signMagnitude(value, width) {
  const w = checkWidth(width);
  const n = toBig(value);
  const magnitude = n < 0n ? -n : n;
  if (magnitude > (1n << (w - 1n)) - 1n) throw new RangeError(`${n} does not fit sign and magnitude on ${width} bits`);
  return (n < 0n ? '1' : '0') + toBinary(magnitude, width - 1);
}

/** Negative numbers are the bitwise NOT of the positive ones. Same range as sign and magnitude. */
export function onesComplement(value, width) {
  const w = checkWidth(width);
  const n = toBig(value);
  const magnitude = n < 0n ? -n : n;
  if (magnitude > (1n << (w - 1n)) - 1n) throw new RangeError(`${n} does not fit one's complement on ${width} bits`);
  return toBinary(n < 0n ? (1n << w) - 1n - magnitude : n, width);
}

/** Range: -2^(w-1) .. 2^(w-1) - 1. */
export function twosComplement(value, width) {
  const w = checkWidth(width);
  const n = toBig(value);
  if (n < -(1n << (w - 1n)) || n > (1n << (w - 1n)) - 1n) {
    throw new RangeError(`${n} does not fit two's complement on ${width} bits`);
  }
  return toBinary(n < 0n ? (1n << w) + n : n, width);
}

/** The value (a BigInt) a bit string stands for. `scheme` is 'ms', 'c1' or 'c2'. */
export function decodeSigned(bits, scheme) {
  const w = BigInt(bits.length);
  const raw = fromBinary(bits);
  const negative = bits[0] === '1';
  if (scheme === 'ms') return negative ? -fromBinary(bits.slice(1)) : raw;
  if (scheme === 'c1') return negative ? -((1n << w) - 1n - raw) : raw;
  if (scheme === 'c2') return negative ? raw - (1n << w) : raw;
  throw new RangeError(`unknown scheme: ${scheme}`);
}

const invert = (bits) => [...bits].map((bit) => (bit === '1' ? '0' : '1')).join('');

/**
 * The working of the conversion of a negative number, as the slides teach it:
 * write the magnitude in binary, fill it with zeros on the left, and then
 *   sign and magnitude   put the sign bit 1 in front of the magnitude (width - 1 bits);
 *   one's complement     invert all the bits;
 *   two's complement     invert all the bits and add 1.
 * `carries` has, for each column of that addition, the carry coming in from the
 * column on its right. Everything is text; the fields are the intermediate
 * results, and `result` is what the schemes above return.
 */
export function complementWorking(value, width, scheme) {
  const n = toBig(value);
  if (n >= 0n) throw new RangeError('the working is shown for negative numbers');
  const encode = { ms: signMagnitude, c1: onesComplement, c2: twosComplement }[scheme];
  if (!encode) throw new RangeError(`unknown scheme: ${scheme}`);
  const result = encode(n, width); // also checks that the number fits
  const magnitude = -n;
  const working = {
    scheme,
    width,
    value: String(n),
    magnitude: String(magnitude),
    magnitudeBits: toBinary(magnitude),
    result,
  };
  if (scheme === 'ms') return { ...working, filled: toBinary(magnitude, width - 1) };

  const filled = toBinary(magnitude, width);
  const inverted = invert(filled);
  if (scheme === 'c1') return { ...working, filled, inverted };

  const addend = `${'0'.repeat(width - 1)}1`;
  const carries = Array(width).fill('0');
  const sum = Array(width).fill('0');
  let carry = 0;
  for (let column = width - 1; column >= 0; column--) {
    carries[column] = String(carry);
    const total = Number(inverted[column]) + Number(addend[column]) + carry;
    sum[column] = String(total % 2);
    carry = total >> 1;
  }
  return { ...working, filled, inverted, addend, carries: carries.join(''), sum: sum.join('') };
}
