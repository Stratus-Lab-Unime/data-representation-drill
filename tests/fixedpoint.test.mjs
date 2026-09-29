import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fraction } from '../engine/fraction.js';
import { fromFixedPoint, toFixedPoint } from '../engine/fixedpoint.js';
import { createRng } from '../engine/rng.js';

const fields = (value, i, d) => {
  const r = toFixedPoint(value, i, d);
  return [r.sign, r.integer, r.fraction];
};

test('the conversions worked in the slides (I=8, D=8)', () => {
  assert.deepEqual(fields('0.453125', 8, 8), ['0', '00000000', '01110100']);
  assert.deepEqual(fields('0.15625', 8, 8), ['0', '00000000', '00101000']);
  assert.deepEqual(fields('0.73543', 8, 8), ['0', '00000000', '10111100']);
  // the ninth fractional bit is 1 but the value is truncated, not rounded
  assert.deepEqual(fields('-254.3476', 8, 8), ['1', '11111110', '01011000']);
});

test('the bit string is sign, integer part, fractional part', () => {
  const r = toFixedPoint('-254.3476', 8, 8);
  assert.equal(r.bits, '1' + '11111110' + '01011000');
  assert.equal(r.bits.length, 1 + 8 + 8);
});

test('decoding the examples of the slides', () => {
  assert.equal(fromFixedPoint('100110110', 4, 4).toString(), '-27/8'); // -3.375
  assert.equal(fromFixedPoint('111011010', 4, 4).toString(), '-109/8'); // -13.625
  const wide = fromFixedPoint('0' + '10111010' + '11010110', 8, 8);
  assert.equal(wide.toString(), Fraction.parse('186.8359375').toString());
});

test('exact tells whether a fractional bit was lost', () => {
  assert.equal(toFixedPoint('0.453125', 8, 8).exact, true);
  assert.equal(toFixedPoint('13.625', 4, 4).exact, true);
  assert.equal(toFixedPoint('0.73543', 8, 8).exact, false);
  assert.equal(toFixedPoint('3.14', 4, 5).exact, false);
  assert.equal(toFixedPoint(5, 4, 4).exact, true);
});

test('accepts decimal commas, Fractions, integers and bigints', () => {
  assert.equal(toFixedPoint('-13,625', 4, 4).bits, toFixedPoint(Fraction.parse('-13.625'), 4, 4).bits);
  assert.equal(toFixedPoint(5, 4, 2).bits, '0' + '0101' + '00');
  assert.equal(toFixedPoint(5n, 4, 2).bits, '0' + '0101' + '00');
});

test('zero has a positive sign', () => {
  assert.equal(toFixedPoint('-0.0', 4, 4).bits, '0' + '0000' + '0000');
});

test('values with no room are refused', () => {
  assert.throws(() => toFixedPoint(16, 4, 4), RangeError);
  assert.throws(() => toFixedPoint('-16.5', 4, 4), RangeError);
  assert.doesNotThrow(() => toFixedPoint('15.9999', 4, 4));
  assert.throws(() => toFixedPoint(1, 0, 4), RangeError);
  assert.throws(() => toFixedPoint(1, 4, -1), RangeError);
  assert.throws(() => fromFixedPoint('0101', 4, 4), RangeError);
});

test('random values are truncated: the result is at most |x| and less than one unit below it', () => {
  const rng = createRng(2026);
  for (let i = 0; i < 1000; i++) {
    const intBits = rng.int(3, 8);
    const fracBits = rng.int(1, 8);
    const negative = rng.chance();
    const text = `${negative ? '-' : ''}${rng.int(0, 2 ** intBits - 1)}.${String(rng.int(0, 9999)).padStart(4, '0')}`;
    const x = Fraction.parse(text);
    const { bits } = toFixedPoint(x, intBits, fracBits);
    const back = fromFixedPoint(bits, intBits, fracBits);
    const unit = new Fraction(1, 1n << BigInt(fracBits));
    assert.ok(back.abs().compare(x.abs()) <= 0, `${text} I=${intBits} D=${fracBits}`); // truncated
    assert.ok(x.abs().sub(back.abs()).compare(unit) < 0, `${text} I=${intBits} D=${fracBits}`); // by less than one unit
    if (x.sign() !== 0 && back.sign() !== 0) assert.equal(back.sign(), x.sign());
  }
});

// ---- the working of a conversion ----

import { fixedPointWorking } from '../engine/fixedpoint.js';

const rowsOf = (working) => working.rows.map((r) => `${r.factor} * 2 = ${r.product} -> ${r.bit}`);

test('the working of the slide for 0.453125 (I=8, D=8)', () => {
  const w = fixedPointWorking('0.453125', 8, 8);
  assert.deepEqual(rowsOf(w), [
    '0.453125 * 2 = 0.90625 -> 0',
    '0.90625 * 2 = 1.8125 -> 1',
    '0.8125 * 2 = 1.625 -> 1',
    '0.625 * 2 = 1.25 -> 1',
    '0.25 * 2 = 0.5 -> 0',
    '0.5 * 2 = 1 -> 1',
  ]);
  assert.equal(w.next, null); // the fraction ended by itself
  assert.equal(w.exact, true);
  assert.equal(w.bits, '0' + '00000000' + '01110100');
  assert.equal(w.value, '0.453125');
});

test('when the D bits run out, the next bit is reported', () => {
  const a = fixedPointWorking('-254.3476', 8, 8);
  assert.equal(a.rows.length, 8);
  assert.equal(a.next, '1'); // the slide notes that it would continue with 1 and is truncated
  assert.equal(a.exact, false);
  assert.equal(a.sign, '1');
  assert.equal(a.integerDecimal, '254');
  assert.equal(a.value, '-254.3476'); // the value keeps its sign
  const b = fixedPointWorking('0.73543', 8, 8);
  assert.equal(b.next, '0'); // the slide says 1 here, but the ninth bit is 0
});

test('the bits of the rows are the fractional bits, padded with zeros', () => {
  const rng = createRng(86);
  for (let i = 0; i < 500; i++) {
    const intBits = rng.int(3, 7);
    const fracBits = rng.int(2, 8);
    const decimals = rng.int(1, 4);
    const text = `${rng.chance() ? '-' : ''}${rng.int(0, 2 ** intBits - 1)}.${String(rng.int(0, 10 ** decimals - 1)).padStart(decimals, '0')}`;
    const w = fixedPointWorking(text, intBits, fracBits);
    assert.equal(w.rows.map((r) => r.bit).join('').padEnd(fracBits, '0'), w.fraction, text);
    assert.equal(w.bits, toFixedPoint(text, intBits, fracBits).bits, text);
    assert.equal(w.rows.length <= fracBits, true);
    assert.equal(w.next === null, w.exact, text);
    w.rows.forEach((row) => {
      assert.equal(Fraction.parse(row.factor).mul(2).toDecimal(), row.product);
      assert.equal(row.product === '1' || Fraction.parse(row.product).compare(1) >= 0 ? '1' : '0', row.bit);
    });
  }
});

test('an integer has no rows', () => {
  const w = fixedPointWorking(5, 4, 4);
  assert.deepEqual(w.rows, []);
  assert.equal(w.next, null);
});
