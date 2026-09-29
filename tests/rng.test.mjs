import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, drawUntil } from '../engine/rng.js';

const first = (rng, count) => Array.from({ length: count }, () => rng.uint32());

// These values are the contract: question codes stay valid across releases only
// while the generator produces exactly this stream. Never update them casually.
test('output is pinned for known seeds', () => {
  assert.deepEqual(first(createRng(0), 5), [548183886, 1097162541, 2219297441, 1664216021, 3479288465]);
  assert.deepEqual(first(createRng(1), 5), [1130556604, 2591592147, 3014952990, 960850752, 2734082507]);
  assert.deepEqual(first(createRng(123456789), 5), [3802896128, 80434582, 3894707069, 3900334430, 1534057038]);
  assert.deepEqual(first(createRng(4294967295), 5), [2246433216, 2156899173, 2040853526, 3823104220, 1358629326]);
});

test('int is pinned for known seeds', () => {
  const dice = createRng(42);
  assert.deepEqual(Array.from({ length: 12 }, () => dice.int(1, 6)), [4, 2, 3, 4, 6, 4, 3, 4, 1, 6, 3, 6]);
  const signed = createRng(7);
  assert.deepEqual(Array.from({ length: 8 }, () => signed.int(-5, 5)), [1, 2, 3, -3, -4, -2, -5, 3]);
});

test('the same seed gives the same stream, different seeds differ', () => {
  assert.deepEqual(first(createRng(99), 100), first(createRng(99), 100));
  assert.notDeepEqual(first(createRng(99), 10), first(createRng(100), 10));
});

test('rejects seeds that are not unsigned 32-bit integers', () => {
  for (const bad of [-1, 2 ** 32, 1.5, NaN, '5', undefined]) {
    assert.throws(() => createRng(bad), RangeError, String(bad));
  }
});

test('int stays in range, hits every value and is roughly uniform', () => {
  const rng = createRng(2024);
  const counts = new Map();
  for (let i = 0; i < 6000; i++) {
    const v = rng.int(1, 6);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  assert.equal(counts.size, 6);
  for (const n of counts.values()) assert.ok(n > 800 && n < 1200, `count ${n}`);
});

test('int handles single-value, negative and full 32-bit ranges', () => {
  const rng = createRng(5);
  assert.equal(rng.int(7, 7), 7);
  for (let i = 0; i < 200; i++) {
    const v = rng.int(-10, -3);
    assert.ok(v >= -10 && v <= -3);
  }
  const wide = rng.int(0, 2 ** 32 - 1);
  assert.ok(wide >= 0 && wide <= 2 ** 32 - 1);
});

test('int rejects invalid ranges', () => {
  const rng = createRng(5);
  assert.throws(() => rng.int(3, 2), RangeError);
  assert.throws(() => rng.int(1.5, 2), RangeError);
  assert.throws(() => rng.int(0, 2 ** 32), RangeError);
  assert.throws(() => rng.int(0, NaN), RangeError);
});

test('float is in [0, 1)', () => {
  const rng = createRng(11);
  for (let i = 0; i < 1000; i++) {
    const f = rng.float();
    assert.ok(f >= 0 && f < 1);
  }
});

test('pick covers all elements and rejects empty input', () => {
  const rng = createRng(3);
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(rng.pick(['a', 'b', 'c']));
  assert.deepEqual([...seen].sort(), ['a', 'b', 'c']);
  assert.throws(() => rng.pick([]), RangeError);
  assert.throws(() => rng.pick('abc'), RangeError);
});

test('chance respects its probability', () => {
  const rng = createRng(8);
  for (let i = 0; i < 100; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
  let hits = 0;
  for (let i = 0; i < 4000; i++) if (rng.chance(0.25)) hits++;
  assert.ok(hits > 800 && hits < 1200, `hits ${hits}`);
});

test('drawUntil returns the first acceptable value', () => {
  const rng = createRng(21);
  const even = drawUntil(rng, (r) => r.int(1, 100), (v) => v % 2 === 0);
  assert.equal(even % 2, 0);
});

test('drawUntil gives up instead of looping forever', () => {
  let calls = 0;
  assert.throws(
    () => drawUntil(createRng(1), () => ++calls, () => false, 5),
    /no acceptable value in 5 draws/,
  );
  assert.equal(calls, 5);
});
