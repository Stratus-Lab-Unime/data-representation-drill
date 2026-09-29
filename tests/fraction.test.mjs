import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fraction } from '../engine/fraction.js';
import { createRng } from '../engine/rng.js';

const F = (n, d = 1n) => new Fraction(n, d);

test('parses decimal text with dot or comma and any minus sign', () => {
  assert.equal(Fraction.parse('-13,625').toString(), '-109/8');
  assert.equal(Fraction.parse('0,45').toString(), '9/20');
  assert.equal(Fraction.parse('3.14').toString(), '157/50');
  assert.equal(Fraction.parse('+3').toString(), '3');
  assert.equal(Fraction.parse('−5,5').toString(), '-11/2');
  assert.equal(Fraction.parse(' 12 ').toString(), '12');
});

test('rejects text that is not a plain decimal number', () => {
  for (const bad of ['', ' ', '1.', '.5', '1,2,3', 'abc', '1e3', '--1', '1 2']) {
    assert.throws(() => Fraction.parse(bad), SyntaxError, JSON.stringify(bad));
  }
});

test('is normalised', () => {
  assert.equal(F(2, 4).toString(), '1/2');
  assert.equal(F(-1, -2).toString(), '1/2');
  assert.equal(F(1, -2).toString(), '-1/2');
  const zero = F(0, 5);
  assert.equal(zero.toString(), '0');
  assert.equal(zero.d, 1n);
  assert.throws(() => F(1, 0), RangeError);
  assert.throws(() => new Fraction(1.5), RangeError);
});

test('is immutable', () => {
  const half = F(1, 2);
  assert.throws(() => { half.n = 5n; }, TypeError);
});

test('basic arithmetic is exact', () => {
  assert.equal(F(1, 2).add(F(1, 3)).toString(), '5/6');
  assert.equal(F(1, 2).sub(F(1, 3)).toString(), '1/6');
  assert.equal(F(2, 3).mul(F(3, 4)).toString(), '1/2');
  assert.equal(F(1, 2).div(F(1, 4)).toString(), '2');
  assert.equal(F(1, 2).neg().toString(), '-1/2');
  assert.equal(F(-3, 4).abs().toString(), '3/4');
  assert.equal(Fraction.parse('0.1').add('0.2').toString(), '3/10'); // floats would give 0.30000000000000004
  assert.throws(() => F(1, 2).div(0), RangeError);
});

test('comparison and sign', () => {
  assert.equal(F(1, 3).compare(F(1, 2)), -1);
  assert.equal(F(1, 2).compare(F(2, 4)), 0);
  assert.equal(F(3, 2).compare(1), 1);
  assert.ok(F(2, 4).equals(F(1, 2)));
  assert.equal(F(-1, 3).sign(), -1);
  assert.equal(F(0).sign(), 0);
  assert.equal(F(7).sign(), 1);
});

test('floor rounds down and trunc rounds toward zero', () => {
  assert.equal(F(7, 2).floor(), 3n);
  assert.equal(F(-7, 2).floor(), -4n);
  assert.equal(F(-4, 2).floor(), -2n);
  assert.equal(F(7, 2).trunc(), 3n);
  assert.equal(F(-7, 2).trunc(), -3n);
  assert.ok(F(4, 2).isInteger());
  assert.ok(!F(7, 2).isInteger());
});

test('mulPow2 shifts the binary point exactly', () => {
  assert.equal(F(3, 8).mulPow2(3).toString(), '3');
  assert.equal(F(3, 8).mulPow2(-1).toString(), '3/16');
  assert.equal(F(5).mulPow2(0).toString(), '5');
  assert.throws(() => F(1).mulPow2(1.5), TypeError);
});

test('exact binary expansion of decimal fractions', () => {
  // 0.3476 = 0.01011000 1... : truncated to 8 bits it is 01011000 (88) and the next bit is 1.
  const a = Fraction.parse('0.3476');
  assert.equal(a.mulPow2(8).floor(), 0b01011000n);
  assert.equal(a.mulPow2(9).floor() % 2n, 1n);
  // 0.73543 = 0.10111100 0... : truncated to 8 bits it is 10111100 (188) and the next bit is 0.
  const b = Fraction.parse('0.73543');
  assert.equal(b.mulPow2(8).floor(), 0b10111100n);
  assert.equal(b.mulPow2(9).floor() % 2n, 0n);
});

test('of() coerces the supported inputs', () => {
  assert.equal(Fraction.of(5n).toString(), '5');
  assert.equal(Fraction.of(-3).toString(), '-3');
  assert.equal(Fraction.of('1,5').toString(), '3/2');
  const x = F(1, 3);
  assert.equal(Fraction.of(x), x);
  assert.throws(() => Fraction.of(1.5), RangeError);
});

test('toNumber approximates', () => {
  assert.equal(Fraction.parse('0.5').toNumber(), 0.5);
  assert.equal(F(-9, 4).toNumber(), -2.25);
});

test('random fractions satisfy the field identities', () => {
  const rng = createRng(77);
  const draw = () => F(rng.int(-500, 500), rng.int(1, 60));
  for (let i = 0; i < 300; i++) {
    const a = draw();
    const b = draw();
    assert.ok(a.add(b).sub(b).equals(a));
    assert.ok(a.sub(b).add(b).equals(a));
    assert.ok(a.add(b).equals(b.add(a)));
    assert.ok(a.mul(b).equals(b.mul(a)));
    if (b.sign() !== 0) assert.ok(a.mul(b).div(b).equals(a));
    const fl = a.floor();
    assert.ok(F(fl).compare(a) <= 0 && a.compare(F(fl + 1n)) < 0);
  }
});

test('toDecimal gives the exact decimal text with the fewest digits', () => {
  assert.equal(Fraction.parse('-13.625').toDecimal(), '-13.625');
  assert.equal(Fraction.parse('0.90625').toDecimal(), '0.90625');
  assert.equal(Fraction.parse('1.50').toDecimal(), '1.5'); // no trailing zero
  assert.equal(Fraction.parse('007.0').toDecimal(), '7');
  assert.equal(F(3, 8).toDecimal(), '0.375');
  assert.equal(F(1).toDecimal(), '1');
  assert.equal(F(0).toDecimal(), '0');
  assert.equal(F(-1, 4).toDecimal(), '-0.25');
  assert.equal(F(1, 1024).toDecimal(), '0.0009765625');
  assert.equal(F(7, 5).toDecimal(), '1.4');
});

test('toDecimal refuses fractions with no finite decimal expansion', () => {
  assert.throws(() => F(1, 3).toDecimal(), RangeError);
  assert.throws(() => F(2, 7).toDecimal(), RangeError);
  assert.throws(() => F(1, 6).toDecimal(), RangeError);
});

test('parse and toDecimal are inverse for random decimals', () => {
  const rng = createRng(505);
  for (let i = 0; i < 500; i++) {
    const decimals = rng.int(0, 7);
    const whole = rng.int(0, 99999);
    const fraction = decimals ? String(rng.int(0, 10 ** decimals - 1)).padStart(decimals, '0') : '';
    const text = `${rng.chance() ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
    const canonical = text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
    const expected = canonical === '-0' ? '0' : canonical;
    assert.equal(Fraction.parse(text).toDecimal(), expected, text);
  }
});
