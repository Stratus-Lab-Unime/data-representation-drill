// Decimal to binary, with the number of times a digit is written in the table of
// successive divisions (dividends, quotients, remainders and divisors).
//
// The digit varies from question to question, from 2 to 9, and is always one that
// does appear. Asking for the digit 2 is the delicate case: the divisor 2 is
// written in every row of the table, so it counts once per division.

import { countDigitInTable, drawUntil, successiveDivisions } from '../../../engine/index.js';

const isPowerOfTwo = (n) => (n & (n - 1)) === 0;

export const decToBin = {
  id: 'dec-to-bin',
  revision: 1,
  generate(rng) {
    const n = drawUntil(rng, (r) => r.int(30, 250), (value) => !isPowerOfTwo(value));
    const table = successiveDivisions(n, 2);
    // only digits that do appear, so the count is never 0; 2 always does (the divisor)
    const digit = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((d) => countDigitInTable(table, d) > 0));
    const count = countDigitInTable(table, digit);
    return {
      prompt: { id: 'dec-to-bin.prompt', values: { n, digit } },
      answer: {
        id: count === 1 ? 'dec-to-bin.answerOne' : 'dec-to-bin.answer',
        values: { binary: table.result, digit, count },
      },
      steps: [{ kind: 'division-table', ...table }],
    };
  },
};
