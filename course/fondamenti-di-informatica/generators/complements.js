// Negative integers in sign and magnitude, one's complement or two's complement,
// on 8 or 16 bits. Only negative numbers: for the others the three schemes agree.

import {
  complementWorking,
  drawUntil,
  onesComplement,
  signMagnitude,
  successiveDivisions,
  twosComplement,
} from '../../../engine/index.js';

const SCHEMES = { ms: signMagnitude, c1: onesComplement, c2: twosComplement };
const isPowerOfTwo = (n) => (n & (n - 1)) === 0;

export const complements = {
  id: 'complements',
  revision: 1,
  generate(rng) {
    const scheme = rng.pick(Object.keys(SCHEMES));
    const width = rng.pick([8, 16]);
    // never -128, the number only two's complement can hold on 8 bits
    const [low, high] = width === 8 ? [8, 127] : [100, 4000];
    const magnitude = drawUntil(rng, (r) => r.int(low, high), (value) => !isPowerOfTwo(value));
    const n = -magnitude;
    return {
      prompt: { id: `complements.prompt.${scheme}`, values: { n, width } },
      answer: { id: 'complements.answer', values: { bits: SCHEMES[scheme](n, width) } },
      // the magnitude by successive divisions, then the steps up to the result
      steps: [
        { kind: 'division-table', ...successiveDivisions(magnitude, 2) },
        { kind: 'complement-steps', ...complementWorking(n, width, scheme) },
      ],
    };
  },
};
