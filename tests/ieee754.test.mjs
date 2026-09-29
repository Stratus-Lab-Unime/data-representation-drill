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
