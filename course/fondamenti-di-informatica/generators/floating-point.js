// Decimal to IEEE 754 single precision. Numbers have one to three decimals and
// are below 400 in absolute value. Cases where the course's rounding rule (round
// up when the next bit is 1) and the standard's (ties to even) differ are skipped.

import { drawUntil, ieee754Working, toIeee754Single } from '../../../engine/index.js';

function randomDecimal(rng) {
  const decimals = rng.int(1, 3);
  let fraction;
  do fraction = rng.int(1, 10 ** decimals - 1);
  while (fraction % 10 === 0); // no trailing zero
  const text = `${rng.int(1, 399)}.${String(fraction).padStart(decimals, '0')}`;
  return rng.chance() ? `-${text}` : text;
}

export const floatingPoint = {
  id: 'floating-point',
  revision: 1,
  generate(rng) {
    const value = drawUntil(rng, randomDecimal, (text) => !toIeee754Single(text).tie);
    const { sign, exponent, mantissa, bits } = toIeee754Single(value);
    return {
      prompt: { id: 'floating-point.prompt', values: { value } },
      answer: { id: 'floating-point.answer', values: { bits, sign, exponent, mantissa } },
      steps: [{ kind: 'ieee-steps', ...ieee754Working(value) }],
    };
  },
};
