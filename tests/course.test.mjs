import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENERATORS, createCourse, messages } from '../course/fondamenti-di-informatica/index.js';

const { registry, renderer, categories } = createCourse();

// A fixed, spread-out set of seeds: the tests are deterministic.
const SEEDS = Array.from({ length: 400 }, (_, i) => (i * 2654435 + 17) % 1073741824);
const questionsOf = (id) => SEEDS.map((seed) => registry.generate(id, seed));
const isPowerOfTwo = (n) => (n & (n - 1)) === 0;
const log2 = (n) => Math.log2(n);

// ---- independent oracles: plain Number/BigInt code, nothing shared with the engine ----

function slowTableCount(value, base, digit) {
  let written = String(value);
  for (let n = value; n > 0; n = Math.floor(n / base)) {
    written += String(base) + String(n % base) + String(Math.floor(n / base));
  }
  return written.split(digit).length - 1;
}

function slowFixed(text, intBits, fracBits) {
  const negative = text.startsWith('-');
  const [whole, fraction] = text.replace('-', '').split('.');
  let numerator = BigInt(fraction);
  const denominator = 10n ** BigInt(fraction.length);
  let bits = '';
  for (let i = 0; i < fracBits; i++) {
    numerator *= 2n;
    if (numerator >= denominator) {
      bits += '1';
      numerator -= denominator;
    } else {
      bits += '0';
    }
  }
  return (negative ? '1' : '0') + Number(whole).toString(2).padStart(intBits, '0') + bits;
}

function float32Bits(text) {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, Number(text));
  return view.getUint32(0).toString(2).padStart(32, '0');
}

const pad = (n, width) => n.toString(2).padStart(width, '0');
const complementOracle = {
  ms: (n, w) => (n < 0 ? '1' : '0') + pad(Math.abs(n), w - 1),
  c1: (n, w) => pad(n < 0 ? 2 ** w - 1 + n : n, w),
  c2: (n, w) => pad(n < 0 ? 2 ** w + n : n, w),
};

function slowDivisionCount(dividend, divisor) {
  const pop = (n) => n.toString(2).split('').filter((c) => c === '1').length;
  let total = pop(dividend) + pop(divisor) + pop(Math.floor(dividend / divisor));
  let rest = 0;
  let started = false;
  for (const bit of dividend.toString(2)) {
    rest = rest * 2 + Number(bit);
    if (started && bit === '1') total += 1;
    const takes = rest >= divisor;
    if (takes) rest -= divisor;
    if (takes) started = true;
    if (started) total += pop(takes ? divisor : 0) + pop(rest);
  }
  return total;
}

// ---- the pack as a whole ----

test('the course offers the nine categories in order, each with a label', () => {
  assert.deepEqual(GENERATORS.map((g) => g.id), [
    'dec-to-bin', 'bin-to-dec', 'dec-to-hex', 'fixed-point', 'floating-point',
    'complements', 'binary-division', 'ascii-size', 'image-size',
  ]);
  assert.deepEqual(registry.list(), GENERATORS.map((g) => g.id));
  assert.equal(new Set(categories.map((c) => c.label)).size, 9);
  assert.ok(categories.every((c) => c.label.length > 3));
});

test('every generator is deterministic and its codes regenerate the question', () => {
  for (const { id } of categories) {
    for (const seed of SEEDS.slice(0, 40)) {
      const question = registry.generate(id, seed);
      assert.deepEqual(registry.generate(id, seed), question);
      assert.deepEqual(registry.fromCode(question.code), question);
    }
  }
});

test('every question renders to clean text', () => {
  for (const { id } of categories) {
    for (const question of questionsOf(id)) {
      const { prompt, answer } = renderer.renderQuestion(question);
      for (const text of [prompt, answer]) {
        assert.ok(text.length > 0);
        assert.doesNotMatch(text, /[{}]|undefined|NaN|null|\[object/, `${question.code}: ${text}`);
      }
    }
  }
});

test('the texts use exactly the messages the generators produce', () => {
  for (const { id } of categories) {
    const used = new Set();
    for (const q of questionsOf(id)) {
      used.add(q.prompt.id);
      used.add(q.answer.id);
    }
    const defined = Object.keys(messages).filter((key) => key.startsWith(`${id}.`));
    assert.deepEqual([...used].sort(), defined.sort(), id);
  }
});

test('student texts are in the impersonal form: no "tu", "voi" or imperatives', () => {
  const second = /\b(tu|te|ti|tuo|tua|tuoi|tue|voi|vi|vostro|vostra|vostri|vostre|noi|nostro|nostra)\b/i;
  const imperatives = /\b(calcola|scrivi|indica|converti|rappresenta|trova|determina|ordina|completa|ricorda|considera)\b/i;
  for (const [key, text] of Object.entries(messages)) {
    assert.doesNotMatch(text, second, key);
    assert.doesNotMatch(text, imperatives, key);
  }
});

test('binary divisions always ask for the number of 1s, never of 0s', () => {
  assert.match(messages['binary-division.prompt'], /numero di '1'/);
  assert.doesNotMatch(messages['binary-division.prompt'], /numero di '0'|zeri/);
  assert.match(messages['binary-division.answer'], /numero di '1'/);
});

test('the wording carries the precisions agreed for the questions', () => {
  assert.match(messages['dec-to-bin.prompt'], /dividendi, quozienti, resti e divisori/);
  assert.match(messages['fixed-point.prompt'], /troncata a D bit/);
  assert.match(messages['binary-division.prompt'], /sottraendi, resti parziali con il bit abbassato e resto finale/);
});

test('every category offers enough variety', () => {
  // the small spaces are pinned below, so 400 draws show fewer different questions in them
  const minimum = { 'bin-to-dec': 180, 'dec-to-hex': 130, 'image-size': 150, 'binary-division': 250 };
  for (const { id } of categories) {
    const prompts = new Set(questionsOf(id).map((q) => JSON.stringify(q.prompt)));
    assert.ok(prompts.size >= (minimum[id] ?? 250), `${id}: only ${prompts.size} different prompts in 400`);
  }
});

// How many different questions the small categories can produce. Worth pinning: a student
// practising a category meets repeats after a few dozen questions, so a change here matters.
//   bin-to-dec       7 or 8 bit strings with 3 or more 1s, at most length-2 of them, at most two
//                    leading zeros: 280
//   dec-to-hex       the numbers from 64 to 255 that are not multiples of 16: 180
//   binary-division  dividend 18..90, divisor 2..9, quotient at least 4: 534
//   image-size       standard resolutions and depths with a whole number of KB, four variants: 252
test('the small question spaces are covered completely and nothing else appears', () => {
  const expected = { 'bin-to-dec': 280, 'dec-to-hex': 180, 'binary-division': 534, 'image-size': 252 };
  for (const [id, size] of Object.entries(expected)) {
    const seen = new Set();
    for (let seed = 0; seed < 40000; seed++) seen.add(JSON.stringify(registry.generate(id, seed).prompt));
    assert.equal(seen.size, size, id);
  }
});

// ---- one block of checks per generator ----

test('dec-to-bin: binary, digit count and the division table', () => {
  const digits = new Set();
  for (const q of questionsOf('dec-to-bin')) {
    const { n, digit } = q.prompt.values;
    const { binary, count } = q.answer.values;
    assert.ok(n >= 30 && n <= 250 && !isPowerOfTwo(n));
    assert.ok(digit >= 2 && digit <= 9);
    digits.add(digit);
    assert.equal(binary, n.toString(2));
    assert.equal(count, slowTableCount(n, 2, String(digit)));
    assert.ok(count >= 1);
    assert.equal(q.answer.id, count === 1 ? 'dec-to-bin.answerOne' : 'dec-to-bin.answer');
    const [table] = q.steps;
    assert.equal(table.kind, 'division-table');
    assert.equal(table.value, String(n));
    assert.equal(table.result, binary);
  }
  assert.equal(digits.size, 8);
});

test('dec-to-bin: asking for the digit 2 counts the divisor written in every row', () => {
  const twos = questionsOf('dec-to-bin').filter((q) => q.prompt.values.digit === 2);
  assert.ok(twos.length > 20);
  for (const q of twos) {
    const [table] = q.steps;
    const inNumbers = [table.value, ...table.rows.flatMap((r) => [r.remainder, r.quotient])].join('').split('2').length - 1;
    assert.equal(q.answer.values.count, inNumbers + table.rows.length);
  }
});

test('bin-to-dec: value and shape of the binary number', () => {
  for (const q of questionsOf('bin-to-dec')) {
    const { bits } = q.prompt.values;
    assert.match(bits, /^[01]{7,8}$/);
    assert.doesNotMatch(bits, /^000/);
    const ones = bits.split('1').length - 1;
    assert.ok(ones >= 3 && ones <= bits.length - 2);
    assert.equal(q.answer.values.value, parseInt(bits, 2));
  }
});

test('dec-to-hex: hexadecimal digits and the division table', () => {
  for (const q of questionsOf('dec-to-hex')) {
    const { n } = q.prompt.values;
    assert.ok(n >= 64 && n <= 255 && n % 16 !== 0);
    assert.equal(q.answer.values.hex, n.toString(16).toUpperCase());
    const [table] = q.steps;
    assert.equal(table.kind, 'division-table');
    assert.equal(table.base, 16);
    assert.equal(table.result, q.answer.values.hex);
    assert.ok(table.rows.every((r) => r.divisor === '16'));
  }
});

test('fixed-point: truncated bits, format and a balanced mix of exact and inexact fractions', () => {
  let exact = 0;
  let negative = 0;
  for (const q of questionsOf('fixed-point')) {
    const { value, intBits, fracBits } = q.prompt.values;
    assert.ok(intBits >= 4 && intBits <= 6 && fracBits >= 4 && fracBits <= 6);
    assert.match(value, /^-?\d+\.\d{1,3}$/);
    const [whole, fraction] = value.replace('-', '').split('.');
    assert.ok(Number(whole) >= 1 && Number(whole) < 2 ** intBits);
    assert.doesNotMatch(fraction, /0$/);
    const { bits, sign, integer, fraction: fractionBits } = q.answer.values;
    assert.equal(bits, slowFixed(value, intBits, fracBits));
    assert.equal(bits, sign + integer + fractionBits);
    assert.equal(bits.length, 1 + intBits + fracBits);
    assert.equal(sign, value.startsWith('-') ? '1' : '0');
    if ((BigInt(fraction) * 2n ** BigInt(fracBits)) % 10n ** BigInt(fraction.length) === 0n) exact++;
    if (value.startsWith('-')) negative++;
  }
  assert.ok(exact > 140 && exact < 260, `exact fractions: ${exact}`);
  assert.ok(negative > 140 && negative < 260, `negative numbers: ${negative}`);
});

test('floating-point: agrees with the platform conversion and stays in range', () => {
  for (const q of questionsOf('floating-point')) {
    const { value } = q.prompt.values;
    assert.match(value, /^-?\d{1,3}\.\d{1,3}$/);
    const magnitude = Number(value.replace('-', ''));
    assert.ok(magnitude >= 1 && magnitude < 400);
    assert.doesNotMatch(value, /0$/);
    const { bits, sign, exponent, mantissa } = q.answer.values;
    assert.equal(bits, float32Bits(value), value);
    assert.equal(bits, sign + exponent + mantissa);
    assert.equal(sign, value.startsWith('-') ? '1' : '0');
    assert.equal(exponent.length, 8);
    assert.equal(mantissa.length, 23);
  }
});

test('complements: matches the oracle for every scheme and width', () => {
  const seen = new Set();
  for (const q of questionsOf('complements')) {
    const scheme = q.prompt.id.split('.').at(-1);
    const { n, width } = q.prompt.values;
    seen.add(`${scheme}-${width}`);
    assert.ok(n < 0);
    const magnitude = -n;
    assert.ok(!isPowerOfTwo(magnitude));
    if (width === 8) assert.ok(magnitude >= 8 && magnitude <= 127);
    else assert.ok(magnitude >= 100 && magnitude <= 4000);
    assert.equal(q.answer.values.bits, complementOracle[scheme](n, width), `${scheme} ${n}/${width}`);
    assert.equal(q.answer.values.bits.length, width);
  }
  assert.equal(seen.size, 6);
});

test('binary-division: quotient, remainder, count of 1 and the drawing model', () => {
  for (const q of questionsOf('binary-division')) {
    const { dividend, divisor } = q.prompt.values;
    assert.ok(dividend >= 18 && dividend <= 90 && divisor >= 2 && divisor <= 9);
    assert.ok(Math.floor(dividend / divisor) >= 4);
    const { quotient, remainder, ones } = q.answer.values;
    assert.equal(quotient, Math.floor(dividend / divisor).toString(2));
    assert.equal(remainder, (dividend % divisor).toString(2));
    assert.equal(ones, slowDivisionCount(dividend, divisor));
    const [model] = q.steps;
    assert.equal(model.kind, 'long-division');
    assert.equal(model.dividend, dividend.toString(2));
    assert.equal(model.quotient, quotient);
    assert.equal(model.remainder, remainder);
  }
});

test('ascii-size: bytes are pages x rows x characters, with the singular for one page', () => {
  let onePage = 0;
  for (const q of questionsOf('ascii-size')) {
    const { pages, rows, chars } = q.prompt.values;
    assert.ok(pages >= 1 && pages <= 6 && rows >= 20 && rows <= 100 && chars >= 40 && chars <= 100);
    assert.equal(q.answer.values.bytes, pages * rows * chars);
    assert.equal(q.prompt.id, pages === 1 ? 'ascii-size.promptOnePage' : 'ascii-size.prompt');
    if (pages === 1) onePage++;
  }
  assert.ok(onePage > 30, `one-page questions: ${onePage}`);
});

test('image-size: every variant is exact and consistent', () => {
  const variants = new Map();
  for (const q of questionsOf('image-size')) {
    const variant = q.prompt.id.split('.').slice(1, 2)[0];
    variants.set(variant, (variants.get(variant) ?? 0) + 1);
    const v = q.prompt.values;
    const a = q.answer.values;
    if (variant === 'kb') {
      assert.equal(v.width * v.height * log2(v.colors), a.kb * 8192);
    } else if (variant === 'side') {
      const side = q.prompt.id.endsWith('baseFromHeight') ? v.height : v.width;
      assert.equal(a.pixels * side * log2(v.colors), v.kb * 8192);
    } else if (variant === 'bits') {
      assert.equal(v.width * v.height * a.bits, v.kb * 8192);
    } else {
      assert.equal(a.colors, 2 ** a.bits);
      assert.equal(v.width * v.height * a.bits, v.kb * 8192);
    }
    for (const value of [...Object.values(v), ...Object.values(a)]) assert.ok(Number.isInteger(value));
  }
  assert.deepEqual([...variants.keys()].sort(), ['bits', 'colors', 'kb', 'side']);
  for (const count of variants.values()) assert.ok(count > 60, `variant counts: ${[...variants]}`);
});

test('24-bit images are called "16,7 milioni di colori"', () => {
  const text = renderer.render({ id: 'image-size.kb.prompt', values: { width: 800, height: 600, colors: 2 ** 24 } });
  assert.match(text, /a 16,7 milioni di colori\?$/);
  const plain = renderer.render({ id: 'image-size.kb.prompt', values: { width: 800, height: 600, colors: 256 } });
  assert.match(plain, /a 256 colori\?$/);
});

test('decimal numbers are written with the comma', () => {
  const text = renderer.render({ id: 'fixed-point.prompt', values: { value: '-13.625', intBits: 4, fracBits: 4 } });
  assert.match(text, /-13,625/);
});
