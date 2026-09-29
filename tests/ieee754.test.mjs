import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fraction } from '../engine/fraction.js';
import { fromIeee754Single, toIeee754Single } from '../engine/ieee754.js';
import { createRng } from '../engine/rng.js';

const parts = (value) => {
  const r = toIeee754Single(value);
  return `${r.sign}|${r.exponent}|${r.mantissa}`;
};

// Independent reference: the hardware conversion of the platform.
function reference(text) {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, Number(text));
  return view.getUint32(0).toString(2).padStart(32, '0');
}

test('the examples worked in the slides', () => {
  assert.equal(parts('-612.1875'), '1|10001000|00110010000110000000000');
  assert.equal(parts('1574.873'), '0|10001001|10001001101101111110000'); // rounded up
  assert.equal(parts('-234987'), '1|10010000|11001010111101011000000'); // truncated
});

test('decoding the example of the slides (pi)', () => {
  const value = fromIeee754Single('01000000010010010000111111011011');
  assert.ok(Math.abs(value.toNumber() - 3.1415927) < 1e-7);
});

test('the fields and the whole string', () => {
  const r = toIeee754Single('11.5');
  assert.equal(r.bits, r.sign + r.exponent + r.mantissa);
  assert.equal(r.bits.length, 32);
  assert.equal(r.exponent.length, 8);
  assert.equal(r.mantissa.length, 23);
  assert.equal(r.power, 3); // 11.5 = 1011.1 = 1.0111 x 2^3
  assert.equal(r.exponent, '10000010'); // 3 + 127 = 130
  assert.equal(r.tie, false);
});

test('powers of two and zero', () => {
  assert.equal(parts('1'), '0|01111111|00000000000000000000000');
  assert.equal(parts('2'), '0|10000000|00000000000000000000000');
  assert.equal(parts('0.5'), '0|01111110|00000000000000000000000');
  assert.equal(parts('-4'), '1|10000001|00000000000000000000000');
  assert.equal(parts('0'), '0|00000000|00000000000000000000000');
});

test('a rounding that carries into the exponent', () => {
  // just below 2: 1.11...1 with the next bit 1 rounds up to 10.0
  assert.equal(parts('1.999999999'), '0|10000000|00000000000000000000000');
});

test('the tie is reported and rounded up, as the slides teach', () => {
  const tie = Fraction.parse('1.000000059604644775390625'); // 1 + 2^-24, exactly half an ulp
  const r = toIeee754Single(tie);
  assert.equal(r.tie, true);
  assert.equal(r.mantissa, `${'0'.repeat(22)}1`); // the standard would round to even and give all zeros
  assert.equal(toIeee754Single('1.0000000596046').tie, false);
});

test('agrees with the platform for many decimals, ties aside', () => {
  const rng = createRng(754);
  for (let i = 0; i < 5000; i++) {
    const decimals = rng.int(0, 4);
    const whole = rng.int(0, 5000);
    const text = decimals ? `${whole}.${String(rng.int(0, 10 ** decimals - 1)).padStart(decimals, '0')}` : String(whole);
    const signed = rng.chance() ? `-${text}` : text;
    if (Number(text) === 0) continue;
    const r = toIeee754Single(signed);
    if (r.tie) continue;
    assert.equal(r.bits, reference(signed), signed);
  }
});

test('the result is the nearest float: within half an ulp of the value', () => {
  const rng = createRng(11);
  for (let i = 0; i < 2000; i++) {
    const x = Fraction.parse(`${rng.int(1, 100000)}.${String(rng.int(0, 999999)).padStart(6, '0')}`);
    const r = toIeee754Single(x);
    const halfUlp = new Fraction(1).mulPow2(r.power - 24);
    const error = x.sub(fromIeee754Single(r.bits)).abs();
    assert.ok(error.compare(halfUlp) <= 0, x.toString());
  }
});

test('encoding then decoding gives back exactly the numbers that fit', () => {
  for (const text of ['0.5', '1', '11.5', '-100.125', '1024', '0.15625', '-0.0009765625']) {
    assert.equal(fromIeee754Single(toIeee754Single(text).bits).toString(), Fraction.parse(text).toString(), text);
  }
});

test('values outside the normal range are refused', () => {
  assert.throws(() => toIeee754Single('0.0000000000000000000000000000000000000000001'), RangeError);
  assert.throws(() => toIeee754Single(`1${'0'.repeat(39)}`), RangeError);
});

test('decoding refuses malformed or non-normal input', () => {
  assert.throws(() => fromIeee754Single('0101'), SyntaxError);
  assert.throws(() => fromIeee754Single('2'.repeat(32)), SyntaxError);
  assert.throws(() => fromIeee754Single(`0${'0'.repeat(8)}${'0'.repeat(23)}`), RangeError); // zero: exponent 0
  assert.throws(() => fromIeee754Single(`0${'1'.repeat(8)}${'0'.repeat(23)}`), RangeError); // infinity: exponent 255
});

// ---- the working of a conversion ----

import { ieee754Working } from '../engine/ieee754.js';

// Independent oracle for the bits after the point: long multiplication on BigInt.
function slowFractionBits(text, count) {
  const [, fraction = ''] = text.replace('-', '').split('.');
  let numerator = BigInt(fraction || '0');
  const denominator = 10n ** BigInt(fraction.length || 1);
  let bits = '';
  for (let i = 0; i < count && numerator !== 0n; i++) {
    numerator *= 2n;
    if (numerator >= denominator) {
      bits += '1';
      numerator -= denominator;
    } else {
      bits += '0';
    }
  }
  return { bits, next: numerator === 0n ? null : numerator * 2n >= denominator ? '1' : '0' };
}

test('the working of the slide for -612.1875', () => {
  const w = ieee754Working('-612.1875');
  assert.equal(w.sign, '1');
  assert.equal(w.integerBits, '1001100100');
  assert.equal(w.fractionBits, '0011');
  assert.equal(w.power, 9);
  assert.equal(w.kept, '0011001000011');
  assert.equal(w.padding, 10); // "m has been completed with 10 zero bits"
  assert.equal(w.exponentValue, 136);
  assert.equal(w.exponent, '10001000');
  assert.equal(w.rounding, 'exact');
  assert.equal(w.mantissa, '00110010000110000000000');
  assert.equal(w.bits, '1' + '10001000' + '00110010000110000000000');
  assert.equal(w.value, '-612.1875'); // the value keeps its sign
  assert.equal(w.fractionDecimal, '0.1875');
});

test('1574.873 is rounded up and -234987 needs no rounding at all', () => {
  const up = ieee754Working('1574.873');
  assert.equal(up.rounding, 'rounded-up'); // the bit after the last one stored is 1
  assert.equal(up.next, '1');
  assert.equal(up.kept.length, 23);
  assert.equal(up.padding, 0);
  assert.equal(up.exponentValue, 137);
  // The slide says that -234987 is truncated, but it is an integer of 18 bits: it fits, and the
  // mantissa is only completed with zeros.
  const integer = ieee754Working('-234987');
  assert.equal(integer.rounding, 'exact');
  assert.equal(integer.integerBits.length, 18);
  assert.equal(integer.padding, 6);
  assert.equal(integer.next, null);
});

test('the working agrees with the conversion and with an independent oracle', () => {
  const rng = createRng(93);
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const decimals = rng.int(0, 4);
    const whole = rng.int(1, 5000);
    const text = decimals ? `${whole}.${String(rng.int(1, 10 ** decimals - 1)).padStart(decimals, '0')}` : String(whole);
    const signed = rng.chance() ? `-${text}` : text;
    const w = ieee754Working(signed);
    const r = toIeee754Single(signed);
    assert.equal(w.bits, r.bits, signed);
    assert.equal(w.mantissa, r.mantissa);
    assert.equal(w.exponent, r.exponent);
    const available = 23 - w.power;
    const oracle = slowFractionBits(text, available);
    assert.equal(w.fractionBits, oracle.bits, signed);
    assert.equal(w.next, oracle.next, signed);
    assert.equal(w.rounding, oracle.next === null ? 'exact' : oracle.next === '1' ? 'rounded-up' : 'truncated');
    if (w.rounding === 'exact') assert.equal(w.kept.length + w.padding, 23);
    else assert.equal(w.kept.length, 23);
    assert.equal(w.integerBits, whole.toString(2));
    assert.equal(w.power, whole.toString(2).length - 1);
    seen.add(w.rounding);
  }
  assert.deepEqual([...seen].sort(), ['exact', 'rounded-up', 'truncated']);
});

test('rounding up can carry into the exponent', () => {
  const w = ieee754Working('1.999999999');
  assert.equal(w.carry, true);
  assert.equal(w.exponentValue, 128);
  assert.equal(ieee754Working('1.5').carry, false);
});

test('the working is only for numbers from 1 to 2^24', () => {
  assert.throws(() => ieee754Working('0.5'), RangeError);
  assert.throws(() => ieee754Working('0'), RangeError);
  assert.throws(() => ieee754Working('16777216'), RangeError);
  assert.doesNotThrow(() => ieee754Working('16777215'));
});
