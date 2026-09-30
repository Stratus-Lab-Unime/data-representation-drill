// Size in bytes of a text in extended ASCII: one byte per character.

import { textSizeWorking } from '../workings.js';

export const asciiSize = {
  id: 'ascii-size',
  revision: 1,
  generate(rng) {
    const pages = rng.int(1, 6);
    const rows = rng.int(20, 100);
    const chars = rng.int(40, 100);
    return {
      prompt: {
        id: pages === 1 ? 'ascii-size.promptOnePage' : 'ascii-size.prompt',
        values: { pages, rows, chars },
      },
      answer: { id: 'ascii-size.answer', values: { bytes: pages * rows * chars } },
      steps: [{ kind: 'text-size-steps', ...textSizeWorking(pages, rows, chars) }],
    };
  },
};
