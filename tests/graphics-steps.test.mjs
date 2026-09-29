import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedPointWorking } from '../engine/fixedpoint.js';
import { ieee754Working } from '../engine/ieee754.js';
import { createRng } from '../engine/rng.js';
import { drawFractionTable } from '../app/graphics/fraction-table.js';
import { drawIeeeSteps } from '../app/graphics/ieee-steps.js';
import { assertWellFormed, count, plainTexts, xOf } from './svg-helpers.mjs';

// ---- the table of successive multiplications (fixed point) ----

test('the table for 0.453125 has the rows of the slide, then the result', () => {
  const working = fixedPointWorking('0.453125', 8, 8);
  const markup = drawFractionTable(working, { title: 'Moltiplicazioni successive' });
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.equal(written.length, 3 * 6 + 1);
  assert.deepEqual(written.slice(0, 6), ['0.453125 * 2 =', '0.90625 →', '0', '0.90625 * 2 =', '1.8125 →', '1']);
  assert.deepEqual(written.slice(15, 18), ['0.5 * 2 =', '1 →', '1']);
  assert.equal(written.at(-1), '0.45312510 = 000000000.011101002'); // value, subscript 10, result, subscript 2
  assert.equal(count(markup, /fid-head-red/g), 1); // the arrow along the bits
  assert.equal(written.some((t) => t.includes('continuerebbe')), false); // nothing was left out
});

test('the factors are left-aligned in one column, like in the slide', () => {
  const working = fixedPointWorking('0.453125', 8, 8);
  const markup = drawFractionTable(working);
  const columns = new Set(working.rows.flatMap((r) => xOf(markup, `${r.factor} * 2 =`)));
  assert.equal(columns.size, 1);
});

test('a truncated conversion says what would come next', () => {
  const markup = drawFractionTable(fixedPointWorking('-254.3476', 8, 8));
  assertWellFormed(markup);
  assert.ok(plainTexts(markup).includes('(continuerebbe con 1…, ma i 8 bit sono finiti)'));
  assert.equal(plainTexts(markup).at(-1), '-254.347610 = 111111110.010110002');
});

test('the note can be worded differently', () => {
  const labels = { truncated: 'would go on with {bit}... but {count} bits are all there is' };
  const markup = drawFractionTable(fixedPointWorking('0.73543', 8, 8), { labels });
  assert.ok(plainTexts(markup).includes('would go on with 0... but 8 bits are all there is'));
});

test('a single row has no arrow and an integer has no table at all', () => {
  const one = drawFractionTable(fixedPointWorking('0.5', 4, 4));
  assertWellFormed(one);
  assert.equal(count(one, /fid-head-red/g), 0);
  const none = drawFractionTable(fixedPointWorking(5, 4, 4));
  assertWellFormed(none);
  assert.equal(plainTexts(none).length, 1);
});

test('random conversions draw well-formed tables, always the same for the same input', () => {
  const rng = createRng(123);
  for (let i = 0; i < 300; i++) {
    const intBits = rng.int(4, 6);
    const fracBits = rng.int(4, 6);
    const text = `${rng.chance() ? '-' : ''}${rng.int(1, 2 ** intBits - 1)}.${String(rng.int(1, 999)).padStart(3, '0')}`;
    const markup = drawFractionTable(fixedPointWorking(text, intBits, fracBits));
    assertWellFormed(markup);
    assert.equal(markup, drawFractionTable(fixedPointWorking(text, intBits, fracBits)));
  }
});

// ---- the steps of the IEEE 754 conversion ----

const LABELS = ['Segno', 'Parte intera', 'Parte frazionaria', 'Normalizzazione', 'Esponente', 'Mantissa'];

test('the steps for -612.1875 follow the slides and end with the three fields', () => {
  const working = ieee754Working('-612.1875');
  const markup = drawIeeeSteps(working, { title: 'Conversione IEEE 754' });
  assertWellFormed(markup);
  const written = plainTexts(markup);

  // the step labels come in the order of the slides
  assert.deepEqual(written.filter((t) => LABELS.includes(t)), LABELS);
  for (const line of [
    's = 1',
    '61210 = 10011001002',
    '0.187510 = 00112',
    '1001100100.0011',
    '→ 1.0011001000011 × 29',
    'p = 9',
    'e = p + 127 = 9 + 127 = 136',
    '= 100010002',
    'm = 0011001000011',
    'completata con 10 zeri fino a 23 bit',
  ]) {
    assert.ok(written.includes(line), line);
  }

  // the three fields, each followed by its name
  assert.deepEqual(written.slice(-6), ['1', 's', '10001000', 'e', '00110010000110000000000', 'm']);
  assert.equal(count(markup, /<rect /g), 1);
  assert.equal(count(markup, /<line /g), 2); // the two separators between the fields
  assert.equal(written.some((t) => t.includes('arrotonda') || t.includes('tronca')), false); // exact: nothing to round
});

test('a number that is rounded up shows the rule and the added 1', () => {
  const working = ieee754Working('1574.873');
  const markup = drawIeeeSteps(working);
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.ok(written.includes('Il bit successivo è 1: si arrotonda per eccesso'));
  assert.ok(written.includes(`m = ${working.kept}`));
  assert.ok(written.includes(`+ 1 = ${working.mantissa}`));
  assert.ok(written.some((t) => t.endsWith('…'))); // the fraction goes on beyond the bits shown
  assert.equal(written.some((t) => t.includes('completata')), false); // the mantissa is full
});

test('a number that is truncated shows the rule', () => {
  const rng = createRng(6);
  let working;
  for (let i = 0; i < 1000 && !working; i++) {
    const candidate = ieee754Working(`${rng.int(1, 300)}.${rng.int(1, 999)}`);
    if (candidate.rounding === 'truncated') working = candidate;
  }
  assert.ok(working, 'no truncated example found');
  const markup = drawIeeeSteps(working);
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.ok(written.includes('Il bit successivo è 0: si tronca'));
  assert.equal(written.some((t) => t.startsWith('+ 1 =')), false);
});

test('labels can be replaced', () => {
  const labels = {
    sign: 'Sign', integerPart: 'Integer part', fractionPart: 'Fraction', normalization: 'Normalisation',
    exponent: 'Exponent', mantissa: 'Mantissa', roundUp: 'next bit is 1: round up', truncate: 'next bit is 0: truncate',
    padding: 'padded with {count} zeros to 23 bits', fields: { s: 'S', e: 'E', m: 'M' },
  };
  const markup = drawIeeeSteps(ieee754Working('-612.1875'), { labels });
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.ok(written.includes('Sign') && written.includes('padded with 10 zeros to 23 bits'));
  assert.deepEqual(written.slice(-6).filter((_, i) => i % 2 === 1), ['S', 'E', 'M']);
  assert.equal(written.includes('Segno'), false);
});

test('integers are written without a point in the normalisation', () => {
  const written = plainTexts(drawIeeeSteps(ieee754Working('-234987')));
  assert.ok(written.includes('111001010111101011'));
  assert.equal(written.some((t) => t === '111001010111101011.'), false);
});

test('every drawing has the same width and stays inside it', () => {
  const rng = createRng(754);
  for (let i = 0; i < 300; i++) {
    const text = `${rng.chance() ? '-' : ''}${rng.int(1, 399)}.${rng.int(1, 999)}`;
    const markup = drawIeeeSteps(ieee754Working(text));
    assertWellFormed(markup);
    assert.match(markup, /viewBox="0 0 702\.8 /); // wide enough for the three fields, whatever the number
    assert.equal(markup, drawIeeeSteps(ieee754Working(text)));
  }
});
