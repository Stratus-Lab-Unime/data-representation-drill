// Fixed-point representation: one sign bit, I bits for the integer part and D bits
// for the fractional part. The value is written as sign and magnitude and the
// fractional part is truncated to D bits, never rounded.

import { Fraction } from './fraction.js';
import { fromBinary, toBinary } from './radix.js';

/**
 * `value` is a decimal string, bigint, integer or Fraction. Returns the fields
 * and the whole bit string; `exact` tells whether no fractional bit was lost.
 */
export function toFixedPoint(value, intBits, fracBits) {
  if (!Number.isInteger(intBits) || intBits < 1 || !Number.isInteger(fracBits) || fracBits < 0) {
    throw new RangeError(`invalid format I=${intBits}, D=${fracBits}`);
  }
  const x = Fraction.of(value);
  const magnitude = x.abs();
  const integer = magnitude.trunc();
  if (integer >= 1n << BigInt(intBits)) throw new RangeError(`${x} does not fit ${intBits} integer bits`);
  const scaled = magnitude.sub(new Fraction(integer)).mulPow2(fracBits);
  const sign = x.sign() < 0 ? '1' : '0';
  const integerBits = toBinary(integer, intBits);
  const fractionBits = fracBits > 0 ? toBinary(scaled.floor(), fracBits) : '';
  return {
    sign,
    integer: integerBits,
    fraction: fractionBits,
    bits: sign + integerBits + fractionBits,
    exact: scaled.isInteger(),
  };
}

/**
 * The working of a conversion, as the slides show it: the fractional part is
 * doubled again and again and the integer part of each product is the next bit.
 * It stops when the fraction becomes 0 or when the D bits are used up.
 *
 * `rows` holds, for each doubling, the fraction being doubled, the product and the
 * bit. `next` is the bit that would come after the last one when the D bits ran
 * out before the fraction did (null when nothing was lost). Values must have a
 * finite decimal expansion, as decimal input always does.
 */
export function fixedPointWorking(value, intBits, fracBits) {
  const result = toFixedPoint(value, intBits, fracBits); // validates the input
  const x = Fraction.of(value);
  const magnitude = x.abs();
  const integer = magnitude.trunc();
  let fraction = magnitude.sub(new Fraction(integer));
  const rows = [];
  while (rows.length < fracBits && fraction.sign() !== 0) {
    const product = fraction.mul(2);
    const bit = product.floor();
    rows.push({ factor: fraction.toDecimal(), product: product.toDecimal(), bit: String(bit) });
    fraction = product.sub(new Fraction(bit));
  }
  const next = fraction.sign() !== 0 ? String(fraction.mul(2).floor()) : null;
  return {
    value: x.toDecimal(),
    sign: result.sign,
    integerDecimal: String(integer),
    integerBits: result.integer,
    rows,
    next,
    exact: result.exact,
    fraction: result.fraction,
    bits: result.bits,
  };
}

/** The exact value of a fixed-point bit string, as a Fraction. */
export function fromFixedPoint(bits, intBits, fracBits) {
  if (bits.length !== 1 + intBits + fracBits) throw new RangeError('bit string does not match the format');
  const magnitude = new Fraction(fromBinary(bits.slice(1)), 1n << BigInt(fracBits));
  return bits[0] === '1' ? magnitude.neg() : magnitude;
}
