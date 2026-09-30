// Uncompressed images: size, missing side, bits per pixel or number of colours.
//
// Everything starts from a standard resolution and a colour depth and is kept
// only when the size is a whole number of KB (1 KB = 1024 bytes), so the inverse
// questions have an exact answer and no rounding is ever needed.

import { drawUntil } from '../../../engine/index.js';
import { imageWorking } from '../workings.js';

const RESOLUTIONS = [
  [640, 480], [800, 600], [1024, 600], [1024, 768], [1280, 720], [1280, 960], [1366, 768],
  [1600, 900], [1920, 1080], [1920, 1200], [2048, 1536], [2560, 1440], [3840, 2160],
];
const BITS_PER_KB = 8 * 1024;

function pickImage(rng, depths) {
  const [width, height, bits] = drawUntil(
    rng,
    (r) => [...r.pick(RESOLUTIONS), r.pick(depths)],
    ([w, h, b]) => (w * h * b) % BITS_PER_KB === 0,
  );
  return { width, height, bits, colors: 2 ** bits, kb: (width * height * bits) / BITS_PER_KB };
}

// The working that goes with a question: the numbers that lead to its answer.
const working = (variant, image) => [{ kind: 'image-steps', ...imageWorking(variant, image) }];

const VARIANTS = {
  kb(rng) {
    const image = pickImage(rng, [2, 4, 8, 16, 24]);
    const { width, height, colors, kb } = image;
    return {
      prompt: { id: 'image-size.kb.prompt', values: { width, height, colors } },
      answer: { id: 'image-size.kb.answer', values: { kb } },
      steps: working('kb', image),
    };
  },

  side(rng) {
    const image = pickImage(rng, [4, 8, 16, 24]);
    const { width, height, colors, kb } = image;
    return rng.chance()
      ? {
          prompt: { id: 'image-size.side.baseFromHeight', values: { colors, kb, height } },
          answer: { id: 'image-size.side.answer', values: { pixels: width } },
          steps: working('base', image),
        }
      : {
          prompt: { id: 'image-size.side.heightFromBase', values: { colors, kb, width } },
          answer: { id: 'image-size.side.answer', values: { pixels: height } },
          steps: working('height', image),
        };
  },

  bits(rng) {
    const image = pickImage(rng, [1, 2, 4, 8, 12, 16, 24]);
    const { width, height, bits, kb } = image;
    return {
      prompt: { id: 'image-size.bits.prompt', values: { width, height, kb } },
      answer: { id: 'image-size.bits.answer', values: { bits } },
      steps: working('bits', image),
    };
  },

  colors(rng) {
    const image = pickImage(rng, [1, 2, 4, 8, 12, 16, 24]);
    const { width, height, bits, colors, kb } = image;
    return {
      prompt: { id: 'image-size.colors.prompt', values: { width, height, kb } },
      answer: { id: 'image-size.colors.answer', values: { colors, bits } },
      steps: working('colors', image),
    };
  },
};

export const imageSize = {
  id: 'image-size',
  revision: 1,
  generate(rng) {
    return VARIANTS[rng.pick(Object.keys(VARIANTS))](rng);
  },
};
