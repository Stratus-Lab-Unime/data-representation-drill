import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bitLength, fromBase, fromBinary, popcount, toBase, toBinary } from '../engine/radix.js';
import { createRng } from '../engine/rng.js';

test('converts to a base, with optional zero padding', () => {
  assert.equal(toBase(63, 16), '3F');
  assert.equal(toBase(255, 16, 2), 'FF');
  assert.equal(toBase(5, 2, 8), '00000101');
  assert.equal(toBinary(0), '0');
  assert.equal(toBinary(845), '1101001101');
  assert.equal(toBase(27, 8), '33');
  assert.equal(toBase(35, 36), 'Z');
  assert.equal(toBase(2n ** 100n, 16), `1${'0'.repeat(25)}`);
});

test('refuses values that do not fit or are not valid', () => {
  assert.throws(() => toBase(256, 16, 2), RangeError);
  assert.throws(() => toBase(-1, 2), RangeError);
  assert.throws(() => toBase(1.5, 2), TypeError);
  assert.throws(() => toBase('5', 2), TypeError);
  assert.throws(() => toBase(5, 1), RangeError);
  assert.throws(() => toBase(5, 37), RangeError);
});

test('converts from a base and returns a BigInt', () => {
  assert.equal(fromBase('3f', 16), 63n);
  assert.equal(fromBinary('1101'), 13n);
  assert.equal(fromBinary('00110010'), 50n);
  assert.equal(fromBase('1'.padEnd(26, '0'), 16), 16n ** 25n);
});

test('refuses text with invalid digits', () => {
  assert.throws(() => fromBase('2', 2), SyntaxError);
  assert.throws(() => fromBase('G', 16), SyntaxError);
  assert.throws(() => fromBase('', 2), SyntaxError);
  assert.throws(() => fromBase('1 0', 2), SyntaxError);
  assert.throws(() => fromBase('-1', 10), SyntaxError);
});

test('round-trips random values in several bases', () => {
  const rng = createRng(31);
  for (let i = 0; i < 300; i++) {
    const value = (BigInt(rng.uint32()) << 32n) | BigInt(rng.uint32());
    for (const base of [2, 8, 10, 16, 36]) {
      assert.equal(fromBase(toBase(value, base), base), value);
    }
  }
});

test('popcount counts the 1 bits', () => {
  assert.equal(popcount(0), 0);
  assert.equal(popcount(255), 8);
  assert.equal(popcount(66), 2);
  assert.equal(popcount(0b1101n), 3);
  assert.equal(popcount(2n ** 64n - 1n), 64);
  assert.throws(() => popcount(-1), RangeError);
});

test('bitLength gives the number of bits needed', () => {
  assert.equal(bitLength(0), 0);
  assert.equal(bitLength(1), 1);
  assert.equal(bitLength(255), 8);
  assert.equal(bitLength(256), 9);
  assert.equal(bitLength(2n ** 100n), 101);
});

// ---- the explicit form of a binary number ----

import { binaryValueWorking } from '../engine/radix.js';

test('the examples of the slides: 1011, 1101 and 00110010', () => {
  const a = binaryValueWorking('1011');
  assert.deepEqual(a.columns.map((c) => c.exponent), [3, 2, 1, 0]);
  assert.deepEqual(a.columns.map((c) => c.weight), [8, 4, 2, 1]);
  assert.deepEqual(a.columns.map((c) => c.product), [8, 0, 2, 1]);
  assert.deepEqual(a.addends, [8, 2, 1]);
  assert.equal(a.value, 11);

  const b = binaryValueWorking('1101');
  assert.deepEqual(b.addends, [8, 4, 1]); // 8 + 4 + 1
  assert.equal(b.value, 13);

  const c = binaryValueWorking('00110010');
  assert.deepEqual(c.columns.map((col) => col.digit), [...'00110010']);
  assert.deepEqual(c.addends, [32, 16, 2]);
  assert.equal(c.value, 50);
});

test('the working agrees with the conversion for every 10-bit number', () => {
  for (let n = 0; n < 1024; n++) {
    const bits = n.toString(2).padStart(10, '0');
    const w = binaryValueWorking(bits);
    assert.equal(w.value, n);
    assert.equal(w.columns.length, 10);
    assert.equal(w.addends.reduce((a, b) => a + b, 0), n);
    w.columns.forEach((col, i) => {
      assert.equal(col.weight, 2 ** col.exponent);
      assert.equal(col.exponent, 9 - i);
      assert.equal(col.product, col.digit === '1' ? col.weight : 0);
    });
  }
});

test('zero has no addends and bad input is refused', () => {
  const zero = binaryValueWorking('0000');
  assert.deepEqual(zero.addends, []);
  assert.equal(zero.value, 0);
  for (const bad of ['', '102', 'abc', ' 1', '1'.repeat(53)]) assert.throws(() => binaryValueWorking(bad), SyntaxError, bad);
});
