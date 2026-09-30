// The calculations of a size, written step by step: the size of a text in extended
// ASCII and the numbers of an uncompressed image. Numbers are written with the
// Italian digit grouping, like the answers.

import { drawStepList } from './step-list.js';

const grouping = new Intl.NumberFormat('it');
const n = (value) => grouping.format(value);

const TEXT_LABELS = {
  perPage: 'Caratteri per pagina',
  characters: 'Caratteri totali',
  encoding: 'ASCII esteso',
  oneByte: '1 carattere = 8 bit = 1 byte',
  size: 'Dimensione',
};

/** `working` comes from textSizeWorking(); returns SVG markup. */
export function drawTextSizeSteps(working, { title = '', labels = TEXT_LABELS } = {}) {
  const w = working;
  return drawStepList(
    [
      { label: labels.perPage, parts: [`${w.rows} × ${w.chars} = ${n(w.perPage)}`] },
      { label: labels.characters, parts: [`${w.pages} × ${n(w.perPage)} = ${n(w.characters)}`] },
      { label: labels.encoding, parts: [{ label: labels.oneByte }] },
      { label: labels.size, parts: [`${n(w.characters)} × ${w.bytesPerCharacter} byte = ${n(w.bytes)} byte`] },
    ],
    { title, labelWidth: 170 },
  );
}

const IMAGE_LABELS = {
  bitsPerPixel: 'Bit per pixel',
  coloursToBits: 'colori → {bits} bit per pixel',
  pixels: 'Pixel',
  bytes: 'Byte',
  bits: 'Bit',
  kb: 'KB',
  base: 'Base',
  height: 'Altezza',
  colors: 'Colori',
};

/** `working` comes from imageWorking(); returns SVG markup. The steps depend on what is asked. */
export function drawImageSteps(working, { title = '', labels = IMAGE_LABELS } = {}) {
  const w = working;
  const row = (label, parts) => ({ label, parts });
  // colours are 2 to the number of bits per pixel: the number of bits is the exponent
  const bitsFromColours = row(labels.bitsPerPixel, [
    '2',
    { sup: String(w.bits) },
    { label: ` ${labels.coloursToBits.replace('{bits}', String(w.bits))}` },
  ]);
  const pixelsFromSides = row(labels.pixels, [`${w.width} × ${w.height} = ${n(w.pixels)}`]);
  const bytesFromKb = row(labels.bytes, [`${n(w.kb)} × 1024 = ${n(w.bytes)}`]);
  const bitsFromBytes = row(labels.bits, [`${n(w.bytes)} × 8 = ${n(w.totalBits)}`]);

  let rows;
  if (w.variant === 'kb') {
    rows = [
      bitsFromColours,
      pixelsFromSides,
      row(labels.bytes, [`${n(w.pixels)} × ${w.bits} / 8 = ${n(w.bytes)}`]),
      row(labels.kb, [`${n(w.bytes)} / 1024 = ${n(w.kb)}`]),
    ];
  } else if (w.variant === 'base' || w.variant === 'height') {
    const [unknown, known, value] = w.variant === 'base' ? [labels.base, w.height, w.width] : [labels.height, w.width, w.height];
    rows = [
      bitsFromColours,
      bytesFromKb,
      bitsFromBytes,
      row(labels.pixels, [`${n(w.totalBits)} / ${w.bits} = ${n(w.pixels)}`]),
      row(unknown, [`${n(w.pixels)} / ${known} = ${value}`]),
    ];
  } else {
    rows = [
      bytesFromKb,
      bitsFromBytes,
      pixelsFromSides,
      row(labels.bitsPerPixel, [`${n(w.totalBits)} / ${n(w.pixels)} = ${w.bits}`]),
    ];
    if (w.variant === 'colors') rows.push(row(labels.colors, ['2', { sup: String(w.bits) }, ` = ${n(w.colors)}`]));
  }
  return drawStepList(rows, { title, labelWidth: 150 });
}
