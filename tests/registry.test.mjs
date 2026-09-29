import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CodeError, MAX_SEED, encodeSeed } from '../engine/code.js';
import { QuestionError } from '../engine/question.js';
import { createRegistry } from '../engine/registry.js';

const toy = {
  id: 'toy-add',
  revision: 1,
  generate(rng) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9);
    return {
      prompt: { id: 'toy.prompt', values: { a, b } },
      answer: { id: 'toy.answer', values: { sum: a + b } },
    };
  },
};

function registryWith(...generators) {
  const registry = createRegistry();
  generators.forEach((g) => registry.register(g));
  return registry;
}

// A registry whose only generator returns `result`.
const generating = (result) =>
  registryWith({ id: 'odd', revision: 1, generate: () => result });

const reasonOf = (fn) => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof CodeError, `expected CodeError, got ${error}`);
    return error.reason;
  }
  return assert.fail('did not throw');
};

test('registers generators and lists them in order', () => {
  const registry = registryWith(toy, { ...toy, id: 'toy-two' });
  assert.deepEqual(registry.list(), ['toy-add', 'toy-two']);
  assert.ok(registry.has('toy-add'));
  assert.ok(!registry.has('nope'));
});

test('refuses invalid or duplicate registrations', () => {
  const registry = registryWith(toy);
  assert.throws(() => registry.register(toy), /duplicate/);
  assert.throws(() => registry.register(null), TypeError);
  assert.throws(() => registry.register({ ...toy, id: 'Bad Id' }), TypeError);
  assert.throws(() => registry.register({ ...toy, id: 'x', revision: 0 }), TypeError);
  assert.throws(() => registry.register({ ...toy, id: 'x', revision: undefined }), TypeError);
  assert.throws(() => registry.register({ id: 'x', revision: 1 }), TypeError);
});

test('a seed determines the question', () => {
  const registry = registryWith(toy);
  assert.deepEqual(registry.generate('toy-add', 123), registry.generate('toy-add', 123));
  const prompts = new Set();
  for (let seed = 0; seed < 20; seed++) prompts.add(JSON.stringify(registry.generate('toy-add', seed).prompt));
  assert.ok(prompts.size > 1);
});

test('a question carries its code and metadata', () => {
  const question = registryWith(toy).generate('toy-add', 4242);
  assert.equal(question.code, `toy-add.1.${encodeSeed(4242)}`);
  assert.equal(question.generator, 'toy-add');
  assert.equal(question.revision, 1);
  assert.equal(question.seed, 4242);
  assert.equal(question.prompt.id, 'toy.prompt');
  assert.equal(question.answer.values.sum, question.prompt.values.a + question.prompt.values.b);
});

test('the seed is random unless given, and the code regenerates the question', () => {
  const registry = registryWith(toy);
  for (let i = 0; i < 20; i++) {
    const question = registry.generate('toy-add');
    assert.ok(question.seed >= 0 && question.seed <= MAX_SEED);
    assert.deepEqual(registry.fromCode(question.code), question);
  }
});

test('fromCode is case-insensitive on the seed and tolerates spaces', () => {
  const registry = registryWith(toy);
  const question = registry.generate('toy-add', 987654);
  const [id, revision, seed] = question.code.split('.');
  assert.deepEqual(registry.fromCode(` ${id}.${revision}.${seed.toLowerCase()} `), question);
});

test('fromCode reports why a code cannot be used', () => {
  const registry = registryWith(toy);
  assert.equal(reasonOf(() => registry.fromCode('nonsense')), 'format');
  assert.equal(reasonOf(() => registry.fromCode('toy-add.1.12345')), 'seed');
  assert.equal(reasonOf(() => registry.fromCode('other.1.000000')), 'unknown-generator');
  const newer = registryWith({ ...toy, revision: 2 });
  assert.equal(reasonOf(() => newer.fromCode(registry.generate('toy-add', 5).code)), 'revision');
});

test('generate refuses bad seeds and unknown generators', () => {
  const registry = registryWith(toy);
  for (const seed of [-1, MAX_SEED + 1, 1.5, NaN, '5']) {
    assert.throws(() => registry.generate('toy-add', seed), RangeError, String(seed));
  }
  assert.equal(reasonOf(() => registry.generate('missing', 1)), 'unknown-generator');
});

test('questions are deeply frozen', () => {
  const question = registryWith(toy).generate('toy-add', 1);
  assert.throws(() => { question.prompt.values.a = 99; }, TypeError);
  assert.throws(() => { question.answer.id = 'x'; }, TypeError);
  assert.throws(() => { question.code = 'x'; }, TypeError);
});

test('accepts plain data, including null and steps', () => {
  const registry = generating({
    prompt: { id: 'p', values: { list: [1, 'two', true, null], nested: { x: 1.5 } } },
    answer: { id: 'a' },
    steps: [{ kind: 'row', cells: ['1', '0'] }],
  });
  const question = registry.generate('odd', 1);
  assert.deepEqual(question.answer.values, {});
  assert.deepEqual(question.steps, [{ kind: 'row', cells: ['1', '0'] }]);
});

test('rejects values that are not plain data', () => {
  const answer = { id: 'a', values: {} };
  const bad = [
    { id: 'p', values: { n: 10n } },
    { id: 'p', values: { n: NaN } },
    { id: 'p', values: { n: Infinity } },
    { id: 'p', values: { n: undefined } },
    { id: 'p', values: { f: () => 1 } },
    { id: 'p', values: { d: new Date(0) } },
    { id: 'p', values: { m: new Map() } },
    { id: 'p', values: { deep: [{ n: 1n }] } },
    { id: 'p', values: [1, 2] },
    { id: 'p', values: 'text' },
  ];
  for (const prompt of bad) {
    assert.throws(() => generating({ prompt, answer }).generate('odd', 1), QuestionError, JSON.stringify(prompt, (k, v) => (typeof v === 'bigint' ? 'BIGINT' : v)));
  }
});

test('rejects malformed messages and steps', () => {
  const ok = { id: 'a', values: {} };
  for (const result of [
    undefined,
    {},
    { prompt: ok },
    { answer: ok },
    { prompt: { id: '', values: {} }, answer: ok },
    { prompt: { values: {} }, answer: ok },
    { prompt: ok, answer: { id: 5 } },
    { prompt: ok, answer: ok, steps: [10n] },
  ]) {
    assert.throws(() => generating(result).generate('odd', 1), QuestionError);
  }
});

test('errors thrown by a generator propagate', () => {
  const registry = registryWith({ id: 'boom', revision: 1, generate: () => { throw new Error('broken'); } });
  assert.throws(() => registry.generate('boom', 1), /broken/);
});
