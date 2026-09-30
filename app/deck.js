// A deck deals the questions of one category without repeating one until every
// question the category can produce has been shown. Small categories (a few
// hundred questions) are dealt out completely and then start over.

import { newSeed as randomSeed } from '../engine/index.js';

export function createDeck(registry, id, { newSeed = randomSeed, maxTries = 5000 } = {}) {
  let seen = new Set();

  return {
    /** The next question, different from all the ones shown since the last restart. */
    next() {
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < maxTries; i++) {
          const question = registry.generate(id, newSeed());
          const key = JSON.stringify(question.prompt);
          if (!seen.has(key)) {
            seen.add(key);
            return question;
          }
        }
        seen = new Set(); // nothing new found: the category is used up, start over
      }
      throw new Error(`deck "${id}" cannot produce a question`);
    },

    /** How many questions have been dealt since the last restart. */
    get shown() {
      return seen.size;
    },
  };
}
