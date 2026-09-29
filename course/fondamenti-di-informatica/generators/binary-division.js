// Division of two naturals written in binary: quotient, remainder and the number
// of 1 digits in the whole written scheme.
//
// The count is always of 1s, never of 0s: the number of 1s is certain, while the
// number of 0s depends on the convention used to write the scheme.

import { binaryLongDivision, countOnesInDivision, drawUntil } from '../../../engine/index.js';

export const binaryDivision = {
  id: 'binary-division',
  revision: 1,
  generate(rng) {
    // a quotient of at least 4 (three bits or more), so the scheme has several rows
    const [dividend, divisor] = drawUntil(
      rng,
      (r) => [r.int(18, 90), r.int(2, 9)],
      ([a, b]) => Math.floor(a / b) >= 4,
    );
    const model = binaryLongDivision(dividend, divisor);
    return {
      prompt: { id: 'binary-division.prompt', values: { dividend, divisor } },
      answer: {
        id: 'binary-division.answer',
        values: { quotient: model.quotient, remainder: model.remainder, ones: countOnesInDivision(model) },
      },
      steps: [{ kind: 'long-division', ...model }],
    };
  },
};
