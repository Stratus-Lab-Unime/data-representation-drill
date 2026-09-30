// Binary to decimal, on 7 or 8 bits (leading zeros allowed).

import { binaryValueWorking, drawUntil, fromBinary, popcount } from '../../../engine/index.js';

export const binToDec = {
  id: 'bin-to-dec',
  revision: 1,
  generate(rng) {
    const bits = drawUntil(
      rng,
      (r) => {
        const length = r.int(7, 8);
        return Array.from({ length }, () => (r.chance() ? '1' : '0')).join('');
      },
      // not almost all zeros or all ones, and at most two leading zeros
      (text) => popcount(fromBinary(text)) >= 3 && popcount(fromBinary(text)) <= text.length - 2 && !/^000/.test(text),
    );
    return {
      prompt: { id: 'bin-to-dec.prompt', values: { bits } },
      answer: { id: 'bin-to-dec.answer', values: { value: Number(fromBinary(bits)) } },
      steps: [{ kind: 'positional-table', ...binaryValueWorking(bits) }],
    };
  },
};
