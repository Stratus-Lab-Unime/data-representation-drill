// Decimal to fixed point with I integer bits and D fractional bits (plus a sign
// bit); the fractional part is truncated to D bits.
//
// Half of the numbers have a fraction that is exact in binary (such as .625), the
// other half a two-digit decimal fraction that never is (such as .67), so the
// truncation matters.

import { fixedPointWorking, toFixedPoint } from '../../../engine/index.js';

export const fixedPoint = {
  id: 'fixed-point',
  revision: 1,
  generate(rng) {
    const intBits = rng.int(4, 6);
    const fracBits = rng.int(4, 6);
    const integer = rng.int(1, 2 ** intBits - 1);

    let fraction;
    if (rng.chance()) {
      // k / 2^t written in decimal has exactly t digits: k * 5^t / 10^t
      const t = rng.int(1, 3);
      const k = 2 * rng.int(0, 2 ** (t - 1) - 1) + 1; // odd, so the fraction needs all t bits
      fraction = String(k * 5 ** t).padStart(t, '0');
    } else {
      // two digits, not a multiple of 25 (those are exact) and no trailing zero
      let cents;
      do cents = rng.int(1, 99);
      while (cents % 25 === 0 || cents % 10 === 0);
      fraction = String(cents).padStart(2, '0');
    }

    const value = `${rng.chance() ? '-' : ''}${integer}.${fraction}`;
    const { sign, integer: integerBits, fraction: fractionBits, bits } = toFixedPoint(value, intBits, fracBits);
    return {
      prompt: { id: 'fixed-point.prompt', values: { value, intBits, fracBits } },
      answer: {
        id: 'fixed-point.answer',
        values: { bits, sign, integer: integerBits, fraction: fractionBits },
      },
      steps: [{ kind: 'fraction-table', ...fixedPointWorking(value, intBits, fracBits) }],
    };
  },
};
