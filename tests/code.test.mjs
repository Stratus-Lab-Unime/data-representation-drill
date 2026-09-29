import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CodeError,
  MAX_SEED,
  decodeSeed,
  encodeSeed,
  formatCode,
  isValidId,
  newSeed,
  parseCode,
} from '../engine/code.js';
import { createRng } from '../engine/rng.js';

const reasonOf = (fn) => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof CodeError, `expected CodeError, got ${error}`);
    return error.reason;
  }
  return assert.fail('did not throw');
};

test('seeds encode to 6 characters', () => {
  assert.equal(encodeSeed(0), '000000');
  assert.equal(encodeSeed(1), '000001');
  assert.equal(encodeSeed(10), '00000A');
  assert.equal(encodeSeed(32), '000010');
  assert.equal(encodeSeed(MAX_SEED), 'ZZZZZZ');
});

test('seeds round-trip', () => {
  const rng = createRng(1);
  for (let i = 0; i < 2000; i++) {
    const seed = rng.int(0, MAX_SEED);
    assert.equal(decodeSeed(encodeSeed(seed)), seed);
  }
  assert.equal(decodeSeed(encodeSeed(0)), 0);
  assert.equal(decodeSeed(encodeSeed(MAX_SEED)), MAX_SEED);
});

test('decoding ignores case and maps look-alike characters', () => {
  assert.equal(decodeSeed('abc123'), decodeSeed('ABC123'));
  assert.equal(decodeSeed('0o0il1'), decodeSeed('000111'));
});

test('malformed seeds are rejected', () => {
  for (const bad of ['', 'ABC', '0000000', '00000U', '00-000', 'ÀÀÀÀÀÀ']) {
    assert.equal(reasonOf(() => decodeSeed(bad)), 'seed', bad);
  }
  for (const bad of [-1, MAX_SEED + 1, 1.5, NaN]) {
    assert.equal(reasonOf(() => encodeSeed(bad)), 'seed', String(bad));
  }
});

test('newSeed is in range and its source can be replaced', () => {
  for (let i = 0; i < 100; i++) {
    const seed = newSeed();
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED);
  }
  assert.equal(newSeed((a) => { a[0] = 0xffffffff; }), MAX_SEED);
  assert.equal(newSeed((a) => { a[0] = 0x40000000; }), 0);
});

test('ids are kebab-case', () => {
  for (const ok of ['a', 'bin-to-dec', 'fixed-point2', 'a-1']) assert.ok(isValidId(ok), ok);
  for (const bad of ['', 'Bin', '-x', 'x-', 'a--b', 'a_b', '1a', 'a.b', 'a b', null, 5]) {
    assert.equal(isValidId(bad), false, String(bad));
  }
});

test('codes format and parse', () => {
  assert.equal(formatCode('bin-to-dec', 1, 0), 'bin-to-dec.1.000000');
  const rng = createRng(4);
  for (let i = 0; i < 200; i++) {
    const seed = rng.int(0, MAX_SEED);
    const revision = rng.int(1, 30);
    assert.deepEqual(parseCode(formatCode('two-comp', revision, seed)), { id: 'two-comp', revision, seed });
  }
  assert.deepEqual(parseCode('  ascii-size.2.abc123 '), { id: 'ascii-size', revision: 2, seed: decodeSeed('ABC123') });
});

test('invalid parts are rejected when formatting', () => {
  assert.equal(reasonOf(() => formatCode('Bad', 1, 0)), 'format');
  assert.equal(reasonOf(() => formatCode('ok', 0, 0)), 'format');
  assert.equal(reasonOf(() => formatCode('ok', 1.5, 0)), 'format');
  assert.equal(reasonOf(() => formatCode('ok', 1, -1)), 'seed');
});

test('malformed codes are rejected when parsing', () => {
  for (const bad of ['', 'x', 'a.b.c', 'a.1', 'a.1.', 'bin.x.000000', 'A.1.000000', '.1.000000']) {
    assert.equal(reasonOf(() => parseCode(bad)), 'format', bad);
  }
  assert.equal(reasonOf(() => parseCode('bin.1.12345')), 'seed');
});
