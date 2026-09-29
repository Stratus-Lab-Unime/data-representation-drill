// Seeded pseudo-random numbers.
//
// The algorithm is part of the contract: a question code (generator id, revision,
// seed) must reproduce the same question in every release. Changing anything in
// this file changes what existing codes mean, so the output is pinned by tests.

const TWO_32 = 4294967296;

// Spreads a seed over several well-mixed 32-bit words.
function splitmix32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

// Small fast generator with 128 bits of state; returns unsigned 32-bit integers.
function sfc32(a, b, c, d) {
  return () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
}

/** Creates a generator from an unsigned 32-bit integer seed. */
export function createRng(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed >= TWO_32) {
    throw new RangeError(`createRng: seed must be an unsigned 32-bit integer, got ${seed}`);
  }
  const mix = splitmix32(seed);
  const uint32 = sfc32(mix(), mix(), mix(), mix());
  for (let i = 0; i < 12; i++) uint32(); // warm-up

  return {
    seed,

    /** Unsigned 32-bit integer. */
    uint32,

    /** Float in [0, 1). */
    float: () => uint32() / TWO_32,

    /** Uniform integer in [min, max], both included. */
    int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
        throw new RangeError(`rng.int: invalid range [${min}, ${max}]`);
      }
      const range = max - min + 1;
      if (range > TWO_32) throw new RangeError(`rng.int: range too large [${min}, ${max}]`);
      const limit = TWO_32 - (TWO_32 % range); // rejection sampling avoids modulo bias
      let u;
      do u = uint32();
      while (u >= limit);
      return min + (u % range);
    },

    /** Uniformly chosen element of a non-empty array. */
    pick(items) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new RangeError('rng.pick: needs a non-empty array');
      }
      return items[this.int(0, items.length - 1)];
    },

    /** True with probability p. */
    chance: (p = 0.5) => uint32() / TWO_32 < p,
  };
}

/**
 * Rejection sampling: calls produce(rng) until accept(value) is true. Generators
 * use it to discard degenerate cases. Throws instead of looping forever.
 */
export function drawUntil(rng, produce, accept, maxTries = 1000) {
  for (let i = 0; i < maxTries; i++) {
    const value = produce(rng);
    if (accept(value)) return value;
  }
  throw new Error(`drawUntil: no acceptable value in ${maxTries} draws`);
}
