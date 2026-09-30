// The course pack for Fondamenti di Informatica (first in-course test, block
// "Rappresentazione digitale dell'informazione"): its generators and its Italian
// texts, in the order the categories are offered to students.

import { createRegistry, createRenderer } from '../../engine/index.js';
import { asciiSize } from './generators/ascii-size.js';
import { binToDec } from './generators/bin-to-dec.js';
import { binaryDivision } from './generators/binary-division.js';
import { complements } from './generators/complements.js';
import { decToBin } from './generators/dec-to-bin.js';
import { decToHex } from './generators/dec-to-hex.js';
import { fixedPoint } from './generators/fixed-point.js';
import { floatingPoint } from './generators/floating-point.js';
import { imageSize } from './generators/image-size.js';
import { formatters, locale, messages } from './messages-it.js';

export const GENERATORS = [
  decToBin,
  binToDec,
  decToHex,
  complements,
  fixedPoint,
  floatingPoint,
  binaryDivision,
  asciiSize,
  imageSize,
];

export { formatters, locale, messages };

/** A registry with all the generators, a renderer for the Italian texts and the category list. */
export function createCourse() {
  const registry = createRegistry();
  GENERATORS.forEach((generator) => registry.register(generator));
  const renderer = createRenderer({ locale, messages, formatters });
  const categories = GENERATORS.map(({ id }) => ({
    id,
    label: renderer.render({ id: `category.${id}` }),
  }));
  return { registry, renderer, categories };
}
