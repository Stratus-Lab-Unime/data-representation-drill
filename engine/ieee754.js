// IEEE 754 single precision (32 bits: 1 sign, 8 exponent, 23 mantissa), computed
// exactly from a decimal value the way the course teaches it: normalise to 1.m
// times 2^p, add 127 to p, and after the 23rd mantissa bit round up when the next
// bit is 1 and truncate when it is 0. Only normal numbers are supported.
//
// That rule is round half up. The standard rounds ties to even, so the two differ
// when the discarded part is exactly one half; `tie` reports those cases so that a
// caller can avoid them.

import { Fraction } from './fraction.js';
import { bitLength, fromBinary, toBinary } from './radix.js';

const MANTISSA_BITS = 23;
const BIAS = 127;
const HALF = new Fraction(1, 2);

/** `value` is a decimal string, bigint, integer or Fraction. */
export function toIeee754Single(value) {
  const x = Fraction.of(value);
  const sign = x.sign() < 0 ? '1' : '0';
  if (x.sign() === 0) {
    const zeros = { exponent: '0'.repeat(8), mantissa: '0'.repeat(MANTISSA_BITS) };
    return { sign, ...zeros, bits: sign + zeros.exponent + zeros.mantissa, tie: false, power: null };
  }

  const a = x.abs();
  let power = bitLength(a.n) - bitLength(a.d); // first guess for floor(log2(a)), then corrected
  while (a.mulPow2(-power).compare(2) >= 0) power++;
  while (a.mulPow2(-power).compare(1) < 0) power--;

  const scaled = a.mulPow2(-power).sub(1).mulPow2(MANTISSA_BITS); // (1.m - 1) * 2^23
  let mantissa = scaled.floor();
  const rest = scaled.sub(new Fraction(mantissa));
  const tie = rest.equals(HALF);
  if (rest.compare(HALF) >= 0) mantissa += 1n; // the bit after the last one is 1
  if (mantissa === 1n << BigInt(MANTISSA_BITS)) {
    mantissa = 0n; // rounding carried into the integer part: 1.111... became 10.0
    power += 1;
  }

  const exponentValue = power + BIAS;
  if (exponentValue < 1 || exponentValue > 254) throw new RangeError(`${x} is outside the normal range`);
  const exponent = toBinary(exponentValue, 8);
  const mantissaBits = toBinary(mantissa, MANTISSA_BITS);
  return { sign, exponent, mantissa: mantissaBits, bits: sign + exponent + mantissaBits, tie, power };
}

/** The exact value of a 32-bit normal number, as a Fraction. */
export function fromIeee754Single(bits) {
  if (!/^[01]{32}$/.test(bits)) throw new SyntaxError('expected 32 bits');
  const exponentValue = Number(fromBinary(bits.slice(1, 9)));
  if (exponentValue < 1 || exponentValue > 254) throw new RangeError('only normal numbers are supported');
  const significand = new Fraction(fromBinary(`1${bits.slice(9)}`), 1n << BigInt(MANTISSA_BITS));
  const magnitude = significand.mulPow2(exponentValue - BIAS);
  return bits[0] === '1' ? magnitude.neg() : magnitude;
}
