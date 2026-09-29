// A registry holds the generators of a course pack and turns ids, seeds and
// question codes into questions.
//
// A generator is { id, revision, generate(rng) }:
//   id        kebab-case name, part of the question code
//   revision  integer starting at 1; bump it whenever the generator would produce
//             a different question for the same seed, so old codes are not
//             silently reinterpreted
//   generate  pure function of the rng; returns { prompt, answer, steps? }

import { CodeError, MAX_SEED, isValidId, newSeed, parseCode } from './code.js';
import { makeQuestion } from './question.js';

export function createRegistry() {
  const generators = new Map();

  function get(id) {
    const generator = generators.get(id);
    if (!generator) throw new CodeError(`unknown generator: "${id}"`, 'unknown-generator');
    return generator;
  }

  return {
    register(generator) {
      if (!generator || !isValidId(generator.id)) {
        throw new TypeError(`register: invalid generator id: "${generator?.id}"`);
      }
      if (!Number.isInteger(generator.revision) || generator.revision < 1) {
        throw new TypeError(`register: "${generator.id}" needs an integer revision >= 1`);
      }
      if (typeof generator.generate !== 'function') {
        throw new TypeError(`register: "${generator.id}" needs a generate function`);
      }
      if (generators.has(generator.id)) {
        throw new Error(`register: duplicate generator id "${generator.id}"`);
      }
      generators.set(generator.id, generator);
    },

    has: (id) => generators.has(id),

    /** Ids in registration order. */
    list: () => [...generators.keys()],

    /** A question from generator `id`; the seed is random unless given. */
    generate(id, seed = newSeed()) {
      if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
        throw new RangeError(`generate: seed must be an integer in [0, ${MAX_SEED}]`);
      }
      return makeQuestion(get(id), seed);
    },

    /** Regenerates the question a code stands for. */
    fromCode(code) {
      const { id, revision, seed } = parseCode(code);
      const generator = get(id);
      if (generator.revision !== revision) {
        throw new CodeError(
          `code made with revision ${revision} of "${id}", this build has revision ${generator.revision}`,
          'revision',
        );
      }
      return makeQuestion(generator, seed);
    },
  };
}
