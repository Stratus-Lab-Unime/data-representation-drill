import { test } from 'node:test';
import assert from 'node:assert/strict';
import { complementWorking } from '../engine/complements.js';
import { fixedPointWorking } from '../engine/fixedpoint.js';
import { binaryValueWorking } from '../engine/radix.js';
import { imageWorking, textSizeWorking } from '../course/fondamenti-di-informatica/workings.js';
import { ieee754Working } from '../engine/ieee754.js';
import { createRng } from '../engine/rng.js';
import { drawComplementSteps } from '../app/graphics/complement-steps.js';
import { drawFractionTable } from '../app/graphics/fraction-table.js';
import { drawIeeeSteps } from '../app/graphics/ieee-steps.js';
import { drawPositionalTable } from '../app/graphics/positional-table.js';
import { drawImageSteps, drawTextSizeSteps } from '../app/graphics/size-steps.js';
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

// ---- the steps of the conversion of negative integers ----

const NB = '\u00a0'; // the non-breaking space that keeps the columns of the addition aligned
const STEP_LABELS = ['Segno', 'Modulo', 'Riempimento', 'Inversione', 'Riporti', 'Somma di 1', 'Risultato'];
const startsWith = (written, line) => written.some((t) => t.startsWith(line));

test('two\'s complement of -42: fill, invert, add 1 with the carries in columns', () => {
  const markup = drawComplementSteps(complementWorking(-42, 8, 'c2'), { title: 'Passaggi' });
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.deepEqual(written.filter((t) => STEP_LABELS.includes(t)), STEP_LABELS);
  for (const line of [
    '-42 < 0 \u2192 numero negativo',
    '|-42| = 42',
    '00101010', // 42 filled to 8 bits, no gaps: the same digits as the answer
    '11010101', // inverted
    `${NB.repeat(8)}1${NB}`, // the only carry: into the second column from the right
    `+${NB}00000001`,
    `=${NB}11010110`,
  ]) {
    assert.ok(startsWith(written, line), JSON.stringify(line));
  }
  assert.equal(written.at(-1), '11010110'); // the result closes the list
  assert.ok(written.some((t) => t.includes('ogni 0 diventa 1 e ogni 1 diventa 0')));
  assert.ok(written.some((t) => t.includes('dalla tabella qui sopra')));
  assert.equal(count(markup, /<line /g), 1); // the rule under the addend
});

test('no bit string has gaps inside', () => {
  for (const [n, width, scheme] of [[-42, 8, 'c2'], [-1000, 16, 'c2'], [-43, 8, 'c1'], [-27, 8, 'ms'], [-2824, 16, 'c1']]) {
    const working = complementWorking(n, width, scheme);
    const written = plainTexts(drawComplementSteps(working)).join('\n');
    for (const bits of [working.filled, working.result, working.inverted, working.sum, working.addend]) {
      if (bits) assert.ok(written.includes(bits), `${scheme} ${n}: ${bits}`);
    }
  }
});

test('the columns of the addition line up: the rows have the same length', () => {
  const written = plainTexts(drawComplementSteps(complementWorking(-42, 8, 'c2')));
  const inverted = written.find((t) => t === `${NB}${NB}11010101`);
  const addend = written.find((t) => t.startsWith('+'));
  const sum = written.find((t) => t.startsWith('=') && t.length === addend.length);
  const carries = written.find((t) => t.includes('1') && /^[1\u00a0]+$/.test(t));
  assert.ok(inverted && addend && sum && carries);
  assert.deepEqual([inverted, addend, sum, carries].map((t) => t.length), [10, 10, 10, 10]);
  // the carry sits above the column that receives it
  assert.equal(carries.indexOf('1'), inverted.length - 2);
});

test('a number with no carry shows no carries row', () => {
  const written = plainTexts(drawComplementSteps(complementWorking(-1, 8, 'c2')));
  assert.equal(written.includes('Riporti'), false);
  assert.ok(written.includes('Somma di 1'));
  assert.ok(written.includes(`${NB}${NB}11111110`));
});

test('one\'s complement has no addition and ends with the inverted bits', () => {
  const markup = drawComplementSteps(complementWorking(-43, 8, 'c1'));
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.deepEqual(written.filter((t) => STEP_LABELS.includes(t)), ['Segno', 'Modulo', 'Riempimento', 'Inversione', 'Risultato']);
  assert.ok(startsWith(written, '00101011'));
  assert.equal(written.at(-1), '11010100');
  assert.equal(count(markup, /<line /g), 0);
});

test('sign and magnitude puts the sign bit in front of the magnitude', () => {
  const markup = drawComplementSteps(complementWorking(-27, 8, 'ms'));
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.ok(written.includes('-27 < 0 \u2192 bit di segno 1'));
  assert.ok(startsWith(written, '0011011')); // 7 bits: the sign has its own
  assert.ok(written.some((t) => t.includes('7 bit, con zeri a sinistra')));
  assert.ok(written.includes(`1${NB}0011011`));
  assert.ok(written.includes(`=${NB}10011011`));
  assert.equal(written.includes('Inversione'), false);
});

test('16-bit numbers are written in one piece too', () => {
  const written = plainTexts(drawComplementSteps(complementWorking(-1000, 16, 'c2')));
  assert.ok(startsWith(written, '0000001111101000')); // 1000 filled to 16 bits
  assert.equal(written.at(-1), '1111110000011000'); // the result
});

test('the labels can be replaced', () => {
  const labels = {
    sign: 'Sign', magnitude: 'Magnitude', fill: 'Fill', invert: 'Invert', carries: 'Carries', addOne: 'Add 1',
    result: 'Result', negativeNumber: 'negative', signBit: 'sign bit', fromTable: 'from the table',
    fillBits: '{count} bits', invertRule: 'flip every bit',
  };
  const written = plainTexts(drawComplementSteps(complementWorking(-42, 8, 'c2'), { labels }));
  assert.ok(written.includes('Sign') && written.includes('Add 1') && written.includes('Result'));
  assert.ok(written.some((t) => t.includes('8 bits')));
  assert.equal(written.includes('Segno'), false);
});

test('every case draws a well-formed, deterministic drawing ending with the result', () => {
  const rng = createRng(72);
  for (let i = 0; i < 300; i++) {
    const width = rng.pick([8, 16]);
    const scheme = rng.pick(['ms', 'c1', 'c2']);
    const n = -rng.int(1, 2 ** (width - 1) - 1);
    const working = complementWorking(n, width, scheme);
    const markup = drawComplementSteps(working);
    assertWellFormed(markup);
    assert.equal(markup, drawComplementSteps(working));
    assert.equal(plainTexts(markup).at(-1).replace(/^=\u00a0/, ''), working.result);
  }
});

// ---- the value of a binary number ----

test('the table for 00110010: digits, powers of 2, weights and products, then the sum', () => {
  const markup = drawPositionalTable(binaryValueWorking('00110010'), { title: 'Valore di un numero binario' });
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.deepEqual(written.slice(0, 4), ['Cifra', 'Potenza di 2', 'Peso', 'Prodotto']);
  assert.equal(written.length, 4 + 8 * 4 + 2); // four labels, four texts per column, the sum
  const columns = written.slice(4, 36);
  const row = (k) => columns.filter((_, i) => i % 4 === k);
  assert.deepEqual(row(0), [...'00110010']);
  assert.deepEqual(row(1), ['27', '26', '25', '24', '23', '22', '21', '20']); // 2 and its exponent
  assert.deepEqual(row(2), ['128', '64', '32', '16', '8', '4', '2', '1']);
  assert.deepEqual(row(3), ['0', '0', '32', '16', '0', '0', '2', '0']);
  assert.deepEqual(written.slice(36), ['Somma', '32 + 16 + 2 = 5010']); // the value with its subscript 10
  assert.equal(count(markup, /<line /g), 1);
});

test('a number of zeros has the sum 0, and the labels can be replaced', () => {
  const zero = plainTexts(drawPositionalTable(binaryValueWorking('000')));
  assert.equal(zero.at(-1), '0 = 010');
  const labels = { digit: 'Digit', power: 'Power of 2', weight: 'Weight', product: 'Product', sum: 'Sum' };
  const written = plainTexts(drawPositionalTable(binaryValueWorking('101'), { labels }));
  assert.deepEqual(written.slice(0, 4), ['Digit', 'Power of 2', 'Weight', 'Product']);
  assert.equal(written.includes('Cifra'), false);
});

test('every binary table draws a well-formed, deterministic drawing', () => {
  const rng = createRng(2);
  for (let i = 0; i < 200; i++) {
    const bits = Array.from({ length: rng.int(1, 12) }, () => (rng.chance() ? '1' : '0')).join('');
    const markup = drawPositionalTable(binaryValueWorking(bits));
    assertWellFormed(markup);
    assert.equal(markup, drawPositionalTable(binaryValueWorking(bits)));
  }
});

// ---- the size of a text and the numbers of an image ----

test('the size of a text in steps, with the Italian digit grouping', () => {
  const small = plainTexts(drawTextSizeSteps(textSizeWorking(3, 40, 50), { title: 'Dimensione di un testo' }));
  assert.deepEqual(small, [
    'Caratteri per pagina', '40 \u00d7 50 = 2000',
    'Caratteri totali', '3 \u00d7 2000 = 6000',
    'ASCII esteso', '1 carattere = 8 bit = 1 byte',
    'Dimensione', '6000 \u00d7 1 byte = 6000 byte',
  ]);
  const big = plainTexts(drawTextSizeSteps(textSizeWorking(5, 83, 92)));
  assert.ok(big.includes('5 \u00d7 7636 = 38.180')); // five digits are grouped, four are not
  assert.ok(big.includes('38.180 \u00d7 1 byte = 38.180 byte'));
  assertWellFormed(drawTextSizeSteps(textSizeWorking(5, 83, 92)));
});

const image = { width: 1024, height: 512, bits: 16, kb: 1024 }; // exactly 1024 KB
const labelsOf = (written, known) => written.filter((t) => known.includes(t));
const KNOWN = ['Bit per pixel', 'Pixel', 'Byte', 'Bit', 'KB', 'Base', 'Altezza', 'Colori'];

test('the size of an image in KB: bits per pixel, pixels, bytes, KB', () => {
  const markup = drawImageSteps(imageWorking('kb', image), { title: "Dimensioni di un'immagine" });
  assertWellFormed(markup);
  const written = plainTexts(markup);
  assert.deepEqual(labelsOf(written, KNOWN), ['Bit per pixel', 'Pixel', 'Byte', 'KB']);
  assert.ok(written.some((t) => t.startsWith('216') && t.includes('colori \u2192 16 bit per pixel'))); // 2 to the 16
  for (const line of ['1024 \u00d7 512 = 524.288', '524.288 \u00d7 16 / 8 = 1.048.576', '1.048.576 / 1024 = 1024']) {
    assert.ok(written.includes(line), line);
  }
});

test('a missing side: bits per pixel, bytes, bits, pixels, then the side', () => {
  const base = plainTexts(drawImageSteps(imageWorking('base', image)));
  assert.deepEqual(labelsOf(base, KNOWN), ['Bit per pixel', 'Byte', 'Bit', 'Pixel', 'Base']);
  for (const line of ['1024 \u00d7 1024 = 1.048.576', '1.048.576 \u00d7 8 = 8.388.608', '8.388.608 / 16 = 524.288', '524.288 / 512 = 1024']) {
    assert.ok(base.includes(line), line);
  }
  const height = plainTexts(drawImageSteps(imageWorking('height', image)));
  assert.deepEqual(labelsOf(height, KNOWN), ['Bit per pixel', 'Byte', 'Bit', 'Pixel', 'Altezza']);
  assert.ok(height.includes('524.288 / 1024 = 512'));
});

test('bits per pixel and colours: bytes, bits, pixels, the ratio, then the colours', () => {
  const bits = plainTexts(drawImageSteps(imageWorking('bits', image)));
  assert.deepEqual(labelsOf(bits, KNOWN), ['Byte', 'Bit', 'Pixel', 'Bit per pixel']);
  assert.ok(bits.includes('8.388.608 / 524.288 = 16'));
  const colours = plainTexts(drawImageSteps(imageWorking('colors', image)));
  assert.deepEqual(labelsOf(colours, KNOWN), ['Byte', 'Bit', 'Pixel', 'Bit per pixel', 'Colori']);
  assert.ok(colours.includes('216 = 65.536')); // 2 to the 16 = 65,536
});

test('the image labels can be replaced', () => {
  const labels = {
    bitsPerPixel: 'Bits per pixel', coloursToBits: 'colours -> {bits} bits per pixel', pixels: 'Pixels', bytes: 'Bytes',
    bits: 'Bits', kb: 'KB', base: 'Width', height: 'Height', colors: 'Colours',
  };
  const written = plainTexts(drawImageSteps(imageWorking('kb', image), { labels }));
  assert.ok(written.includes('Bits per pixel') && written.includes('Pixels'));
  assert.ok(written.some((t) => t.includes('colours -> 16 bits per pixel')));
  assert.equal(written.includes('Pixel'), false);
});

test('every image and text draws a well-formed, deterministic drawing', () => {
  const rng = createRng(31);
  for (let i = 0; i < 300; i++) {
    const width = 64 * rng.int(1, 40);
    const height = 64 * rng.int(1, 40);
    const bits = rng.pick([1, 2, 4, 8, 12, 16, 24]);
    const working = imageWorking(rng.pick(['kb', 'base', 'height', 'bits', 'colors']), { width, height, bits, kb: (width * height * bits) / 8192 });
    const markup = drawImageSteps(working);
    assertWellFormed(markup);
    assert.equal(markup, drawImageSteps(working));
    const text = textSizeWorking(rng.int(1, 9), rng.int(1, 120), rng.int(1, 120));
    assertWellFormed(drawTextSizeSteps(text));
  }
});
