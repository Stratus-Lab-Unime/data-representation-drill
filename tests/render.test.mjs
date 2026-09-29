import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../engine/registry.js';
import { createRenderer } from '../engine/render.js';

const messages = {
  q: 'Convert {n} to base {base}.',
  a: 'Result: {value:int}',
  braces: 'Write {{n}} for {n}',
  flag: 'Flag: {on}',
  loud: 'Say {word:upper}',
  object: 'Bad: {thing}',
  format: 'Bad: {n:nope}',
};

const en = createRenderer({ locale: 'en', messages, formatters: { upper: (v) => String(v).toUpperCase() } });

test('substitutes values', () => {
  assert.equal(en.render({ id: 'q', values: { n: 5, base: '2' } }), 'Convert 5 to base 2.');
  assert.equal(en.render({ id: 'flag', values: { on: true } }), 'Flag: true');
});

test('escapes braces', () => {
  assert.equal(en.render({ id: 'braces', values: { n: 5 } }), 'Write {n} for 5');
});

test('formats integers with the locale grouping', () => {
  assert.equal(en.render({ id: 'a', values: { value: 14400 } }), 'Result: 14,400');
  assert.equal(
    en.render({ id: 'a', values: { value: '123456789012345678901234567890' } }),
    'Result: 123,456,789,012,345,678,901,234,567,890',
  );
  const it = createRenderer({ locale: 'it', messages });
  assert.equal(it.render({ id: 'a', values: { value: 14400 } }), 'Result: 14.400');
});

test('the int format refuses anything that is not an integer', () => {
  for (const value of [1.5, 'abc', '1.5', true, null]) {
    assert.throws(() => en.render({ id: 'a', values: { value } }), TypeError, String(value));
  }
});

test('custom formatters are available', () => {
  assert.equal(en.render({ id: 'loud', values: { word: 'hey' } }), 'Say HEY');
});

test('fails loudly on missing pieces', () => {
  assert.throws(() => en.render({ id: 'missing', values: {} }), RangeError);
  assert.throws(() => en.render({ id: 'constructor', values: {} }), RangeError);
  assert.throws(() => en.render({ id: 'q', values: { n: 5 } }), RangeError);
  assert.throws(() => en.render({ id: 'format', values: { n: 5 } }), RangeError);
  assert.throws(() => en.render({ id: 'object', values: { thing: { x: 1 } } }), TypeError);
});

test('renders the prompt and the answer of a question', () => {
  const registry = createRegistry();
  registry.register({
    id: 'toy',
    revision: 1,
    generate: (rng) => {
      const n = rng.int(1, 9);
      return { prompt: { id: 'q', values: { n, base: 2 } }, answer: { id: 'a', values: { value: n * 1000 } } };
    },
  });
  const question = registry.generate('toy', 3);
  const text = en.renderQuestion(question);
  assert.equal(text.prompt, `Convert ${question.prompt.values.n} to base 2.`);
  assert.match(text.answer, /^Result: \d/);
});
