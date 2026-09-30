import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../app/deck.js';
import { createRegistry } from '../engine/registry.js';
import { createCourse } from '../course/fondamenti-di-informatica/index.js';

// A category with exactly `size` different questions.
function smallRegistry(size) {
  const registry = createRegistry();
  registry.register({
    id: 'small',
    revision: 1,
    generate: (rng) => ({ prompt: { id: 'p', values: { n: rng.int(0, size - 1) } }, answer: { id: 'a', values: {} } }),
  });
  return registry;
}

const counterSeeds = () => {
  let seed = 0;
  return () => seed++;
};

test('no question is dealt twice until the category is used up', () => {
  const deck = createDeck(smallRegistry(40), 'small', { newSeed: counterSeeds() });
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const key = JSON.stringify(deck.next().prompt);
    assert.equal(seen.has(key), false, `repeated at ${i}`);
    seen.add(key);
  }
  assert.equal(deck.shown, 40);
});

test('when the category is used up the deck starts over', () => {
  const deck = createDeck(smallRegistry(5), 'small', { newSeed: counterSeeds(), maxTries: 200 });
  for (let i = 0; i < 5; i++) deck.next();
  assert.equal(deck.shown, 5);
  deck.next(); // nothing new is left: restart
  assert.equal(deck.shown, 1);
  const again = new Set();
  for (let i = 0; i < 4; i++) again.add(JSON.stringify(deck.next().prompt));
  assert.equal(again.size, 4);
});

test('a real small category is dealt out completely, with no repeat, then starts over', () => {
  const { registry } = createCourse();
  const deck = createDeck(registry, 'dec-to-hex'); // 180 different questions, random seeds
  const seen = new Set();
  for (let i = 0; i < 180; i++) {
    const key = JSON.stringify(deck.next().prompt);
    assert.equal(seen.has(key), false);
    seen.add(key);
  }
  assert.equal(seen.size, 180);
  assert.doesNotThrow(() => deck.next());
});

test('decks of different categories are independent', () => {
  const { registry } = createCourse();
  const a = createDeck(registry, 'dec-to-bin');
  const b = createDeck(registry, 'ascii-size');
  a.next();
  a.next();
  b.next();
  assert.equal(a.shown, 2);
  assert.equal(b.shown, 1);
});

test('an unknown category fails clearly', () => {
  const { registry } = createCourse();
  assert.throws(() => createDeck(registry, 'nope').next(), /unknown generator/);
});
