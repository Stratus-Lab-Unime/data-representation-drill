// The steps of the two size calculations, as plain data for the drawings. They
// carry the conventions of the course: extended ASCII takes one byte per
// character, and 1 KB is 1024 bytes.

export const BYTES_PER_CHARACTER = 1;
export const BYTES_PER_KB = 1024;

/** Size in bytes of a text of `pages` pages of `rows` rows of `chars` characters. */
export function textSizeWorking(pages, rows, chars) {
  const perPage = rows * chars;
  const characters = pages * perPage;
  return {
    pages,
    rows,
    chars,
    perPage,
    characters,
    bytesPerCharacter: BYTES_PER_CHARACTER,
    bytes: characters * BYTES_PER_CHARACTER,
  };
}

/**
 * The numbers that lead to the answer of a question on an uncompressed image.
 * `variant` is the thing asked: 'kb', 'base' (the missing width), 'height' (the
 * missing height), 'bits' (bits per pixel) or 'colors'. The image is given whole,
 * as width, height, bits per pixel and size in KB, and must be consistent.
 */
export function imageWorking(variant, { width, height, bits, kb }) {
  const pixels = width * height;
  const bytes = kb * BYTES_PER_KB;
  const totalBits = bytes * 8;
  if (pixels * bits !== totalBits) throw new RangeError('the size does not match width, height and bits per pixel');
  return { variant, width, height, bits, colors: 2 ** bits, kb, pixels, bytes, totalBits };
}
