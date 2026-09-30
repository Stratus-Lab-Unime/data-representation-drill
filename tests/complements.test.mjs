import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSigned, onesComplement, signMagnitude, twosComplement } from '../engine/complements.js';
import { createRng } from '../engine/rng.js';

test('the examples of the slides', () => {
  assert.equal(signMagnitude(-27, 8), '10011011');
  assert.equal(onesComplement(-43, 8), '11010100');
  assert.equal(twosComplement(-42, 8), '11010110');
  assert.equal(twosComplement(-128, 8), '10000000');
});

test('the 4-bit tables of the slides', () => {
  const ms = { '-7': '1111', '-1': '1001', '0': '0000', 3: '0011', 7: '0111' };
  const c1 = { '-7': '1000', '-1': '1110', '0': '0000', 3: '0011', 7: '0111' };
  const c2 = { '-8': '1000', '-7': '1001', '-1': '1111', '0': '0000', 3: '0011', 7: '0111' };
  for (const [n, bits] of Object.entries(ms)) assert.equal(signMagnitude(Number(n), 4), bits, `ms ${n}`);
  for (const [n, bits] of Object.entries(c1)) assert.equal(onesComplement(Number(n), 4), bits, `c1 ${n}`);
  for (const [n, bits] of Object.entries(c2)) assert.equal(twosComplement(Number(n), 4), bits, `c2 ${n}`);
});

test('the double zero of sign and magnitude and one\'s complement', () => {
  assert.equal(decodeSigned('10000000', 'ms'), 0n); // -0
  assert.equal(decodeSigned('11111111', 'c1'), 0n); // -0
  assert.equal(decodeSigned('10000000', 'c1'), -127n); // where a -127 lives in one's complement
  assert.equal(decodeSigned('10000000', 'c2'), -128n);
  assert.equal(signMagnitude(0, 8), '00000000');
  assert.equal(onesComplement(0, 8), '00000000');
});

// Independent oracle: plain Number arithmetic, no BigInt and no shared helpers.
const pad = (n, width) => n.toString(2).padStart(width, '0');
const oracle = {
  ms: (n, w) => (n < 0 ? '1' : '0') + pad(Math.abs(n), w - 1),
  c1: (n, w) => pad(n < 0 ? 2 ** w - 1 + n : n, w),
  c2: (n, w) => pad(n < 0 ? 2 ** w + n : n, w),
};

test('every 8-bit value matches the oracle and decodes back', () => {
  for (let n = -127; n <= 127; n++) {
    assert.equal(signMagnitude(n, 8), oracle.ms(n, 8), `ms ${n}`);
    assert.equal(onesComplement(n, 8), oracle.c1(n, 8), `c1 ${n}`);
    assert.equal(decodeSigned(signMagnitude(n, 8), 'ms'), BigInt(n));
    assert.equal(decodeSigned(onesComplement(n, 8), 'c1'), BigInt(n));
  }
  for (let n = -128; n <= 127; n++) {
    assert.equal(twosComplement(n, 8), oracle.c2(n, 8), `c2 ${n}`);
    assert.equal(decodeSigned(twosComplement(n, 8), 'c2'), BigInt(n));
  }
});

test('16-bit values match the oracle and decode back', () => {
  const rng = createRng(16);
  for (let i = 0; i < 2000; i++) {
    const n = rng.int(-32767, 32767);
    assert.equal(signMagnitude(n, 16), oracle.ms(n, 16));
    assert.equal(onesComplement(n, 16), oracle.c1(n, 16));
    assert.equal(twosComplement(n, 16), oracle.c2(n, 16));
    assert.equal(decodeSigned(twosComplement(n, 16), 'c2'), BigInt(n));
  }
  assert.equal(twosComplement(-32768, 16), '1000000000000000');
});

test('non-negative numbers are written the same in every scheme', () => {
  for (const n of [0, 1, 5, 100, 127]) {
    assert.equal(signMagnitude(n, 8), onesComplement(n, 8));
    assert.equal(onesComplement(n, 8), twosComplement(n, 8));
  }
});

test('the relation between the complements: two\'s is one\'s plus one, for negatives', () => {
  for (let n = -127; n < 0; n++) {
    const c1 = BigInt(`0b${onesComplement(n, 8)}`);
    assert.equal(BigInt(`0b${twosComplement(n, 8)}`), c1 + 1n);
  }
});

test('values that do not fit are refused', () => {
  assert.throws(() => signMagnitude(128, 8), RangeError);
  assert.throws(() => signMagnitude(-128, 8), RangeError);
  assert.throws(() => onesComplement(-128, 8), RangeError);
  assert.throws(() => onesComplement(128, 8), RangeError);
  assert.throws(() => twosComplement(128, 8), RangeError);
  assert.throws(() => twosComplement(-129, 8), RangeError);
});

test('invalid arguments are refused', () => {
  assert.throws(() => twosComplement(1, 1), RangeError);
  assert.throws(() => twosComplement(1, 65), RangeError);
  assert.throws(() => twosComplement(1, 8.5), RangeError);
  assert.throws(() => twosComplement(1.5, 8), TypeError);
  assert.throws(() => twosComplement('5', 8), TypeError);
  assert.throws(() => decodeSigned('0101', 'c3'), RangeError);
});

test('wide values work on 64 bits', () => {
  assert.equal(twosComplement(-1n, 64), '1'.repeat(64));
  assert.equal(decodeSigned('1'.repeat(64), 'c2'), -1n);
  assert.equal(signMagnitude(2n ** 63n - 1n, 64), `0${'1'.repeat(63)}`);
});

// ---- the working of a conversion ----

import { complementWorking } from '../engine/complements.js';

test('the working of the slide for -27 in sign and magnitude', () => {
  const w = complementWorking(-27, 8, 'ms');
  assert.equal(w.value, '-27');
  assert.equal(w.magnitude, '27');
  assert.equal(w.magnitudeBits, '11011');
  assert.equal(w.filled, '0011011'); // 7 bits: the sign has its own
  assert.equal(w.result, '10011011');
});

test('the working of the slide for -43 in one\'s complement', () => {
  const w = complementWorking(-43, 8, 'c1');
  assert.equal(w.magnitudeBits, '101011');
  assert.equal(w.filled, '00101011');
  assert.equal(w.inverted, '11010100');
  assert.equal(w.result, '11010100');
});

test('the working of the slide for -42 in two\'s complement: invert and add 1', () => {
  const w = complementWorking(-42, 8, 'c2');
  assert.equal(w.filled, '00101010');
  assert.equal(w.inverted, '11010101');
  assert.equal(w.addend, '00000001');
  assert.equal(w.carries, '00000010'); // 1 + 1 = 10: one carry, into the second column from the right
  assert.equal(w.sum, '11010110');
  assert.equal(w.result, '11010110');
});

test('-1 needs no carry and -128 carries through the whole number', () => {
  const one = complementWorking(-1, 8, 'c2');
  assert.equal(one.inverted, '11111110');
  assert.equal(one.carries, '00000000');
  assert.equal(one.sum, '11111111');
  const big = complementWorking(-128, 8, 'c2');
  assert.equal(big.inverted, '01111111');
  assert.equal(big.carries, '11111110');
  assert.equal(big.sum, '10000000');
});

test('the working agrees with the conversion and every step is consistent', () => {
  const rng = createRng(72);
  for (let i = 0; i < 2000; i++) {
    const width = rng.pick([8, 16]);
    const n = -rng.int(1, 2 ** (width - 1) - 1);
    for (const [scheme, encode] of [['ms', signMagnitude], ['c1', onesComplement], ['c2', twosComplement]]) {
      const w = complementWorking(n, width, scheme);
      assert.equal(w.result, encode(n, width), `${scheme} ${n}/${width}`);
      assert.equal(w.magnitudeBits, (-n).toString(2));
      if (scheme === 'ms') {
        assert.equal(w.filled.length, width - 1);
        assert.equal(`1${w.filled}`, w.result);
        continue;
      }
      assert.equal(w.filled.length, width);
      assert.equal(BigInt(`0b${w.filled}`), BigInt(-n));
      assert.equal(BigInt(`0b${w.filled}`) + BigInt(`0b${w.inverted}`), 2n ** BigInt(width) - 1n); // inverted bits complement to all ones
      if (scheme === 'c1') {
        assert.equal(w.inverted, w.result);
        continue;
      }
      // column by column: bit + bit + carry in = sum bit + 2 * carry out (the carry in of the next column)
      for (let c = 0; c < width; c++) {
        const carryOut = c === 0 ? 0 : Number(w.carries[c - 1]);
        const total = Number(w.inverted[c]) + Number(w.addend[c]) + Number(w.carries[c]);
        assert.equal(total, Number(w.sum[c]) + 2 * carryOut, `column ${c} of ${n}/${width}`);
      }
      assert.equal(w.sum, w.result);
      assert.equal(w.carries[width - 1], '0'); // nothing comes into the rightmost column
    }
  }
});

test('the working refuses what cannot be shown', () => {
  assert.throws(() => complementWorking(5, 8, 'c2'), RangeError);
  assert.throws(() => complementWorking(0, 8, 'c2'), RangeError);
  assert.throws(() => complementWorking(-128, 8, 'ms'), RangeError);
  assert.throws(() => complementWorking(-5, 8, 'c3'), RangeError);
});
