// The two division schemes used to teach base conversion and binary division,
// as plain data that a drawing (or a test) can consume.
//
// successiveDivisions: the staircase table of repeated divisions by the base.
// binaryLongDivision: the schoolbook division of two binary numbers.

import { toBase, toBinary } from './radix.js';

const ones = (text) => [...text].filter((c) => c === '1').length;

/**
 * Repeated division of `value` by `base` until the quotient is 0.
 * Everything is text, as it would be written: numbers in decimal (remainders too,
 * so 15 stays "15") and the result in the target base.
 */
export function successiveDivisions(value, base) {
  const result = toBase(value, base); // validates value and base
  let n = BigInt(value);
  const divisor = BigInt(base);
  const rows = [];
  const written = String(n);
  while (n > 0n) {
    const quotient = n / divisor;
    rows.push({
      dividend: String(n),
      divisor: String(base),
      quotient: String(quotient),
      remainder: String(n % divisor),
    });
    n = quotient;
  }
  return { base, value: written, rows, result };
}

/** Every number written in the table: the value, then divisor, remainder and quotient of each row. */
export function tableTexts(table) {
  return [table.value, ...table.rows.flatMap((r) => [r.divisor, r.remainder, r.quotient])];
}

/** How many times the decimal digit appears in the numbers written in the table. */
export function countDigitInTable(table, digit) {
  if (!/^\d$/.test(String(digit))) throw new RangeError(`countDigitInTable: not a decimal digit: ${digit}`);
  return tableTexts(table).reduce((sum, t) => sum + [...t].filter((c) => c === String(digit)).length, 0);
}

/**
 * Binary long division of two naturals (divisor > 0). One step per digit of the
 * quotient. In each step `partial` is the number being divided (before the
 * subtraction, without leading zeros), `subtrahend` the divisor or zeros,
 * `remainder` what is left (without leading zeros), `width` how many digits the
 * remainder is written with and `next` the dividend bit brought down for the
 * following step (null at the end). `col` is the index of the last dividend digit
 * involved in the step.
 */
export function binaryLongDivision(dividend, divisor) {
  const a = BigInt(dividend);
  const d = BigInt(divisor);
  if (a < 0n || d <= 0n) throw new RangeError('binaryLongDivision: needs a natural dividend and a divisor > 0');
  const dividendBits = toBinary(a);
  const divisorBits = toBinary(d);
  const steps = [];
  let partial = 0n;
  for (let col = 0; col < dividendBits.length; col++) {
    partial = partial * 2n + BigInt(dividendBits[col]);
    if (steps.length === 0 && partial < d) continue; // the quotient has not started yet
    const takes = partial >= d;
    const remainder = takes ? partial - d : partial;
    const significant = toBinary(partial);
    steps.push({
      col,
      partial: significant,
      // digits the remainder is written with: as many as the number it comes from,
      // and never fewer than the divisor has
      width: Math.max(significant.length, divisorBits.length),
      qbit: takes ? '1' : '0',
      subtrahend: takes ? divisorBits : '0'.repeat(divisorBits.length),
      remainder: toBinary(remainder),
      next: col + 1 < dividendBits.length ? dividendBits[col + 1] : null,
    });
    partial = remainder;
  }
  return {
    dividend: dividendBits,
    divisor: divisorBits,
    quotient: steps.length ? steps.map((s) => s.qbit).join('') : '0',
    remainder: toBinary(a % d),
    steps,
  };
}

/**
 * The row written under a step: the remainder with its leading zeros (see `width`),
 * followed by the bit brought down. Zeros do not change the count of 1s.
 */
export function remainderRow(step) {
  return step.remainder.padStart(step.width, '0') + (step.next ?? '');
}

/** Number of 1 digits in the whole written scheme (dividend, divisor, quotient and every row). */
export function countOnesInDivision(model) {
  const rows = model.steps.reduce((sum, s) => sum + ones(s.subtrahend) + ones(remainderRow(s)), 0);
  return ones(model.dividend) + ones(model.divisor) + ones(model.quotient) + rows;
}
