// Decimal to hexadecimal, two digits. The remainders of the divisions by 16 stay
// decimal in the working (15 is written 15) and become letters only in the result.

import { drawUntil, successiveDivisions } from '../../../engine/index.js';

export const decToHex = {
  id: 'dec-to-hex',
  revision: 1,
  generate(rng) {
    // a non-zero low digit, and above 63 so that both hexadecimal digits matter
    const n = drawUntil(rng, (r) => r.int(64, 255), (value) => value % 16 !== 0);
    const table = successiveDivisions(n, 16);
    return {
      prompt: { id: 'dec-to-hex.prompt', values: { n } },
      answer: { id: 'dec-to-hex.answer', values: { hex: table.result } },
      steps: [{ kind: 'division-table', ...table }],
    };
  },
};
