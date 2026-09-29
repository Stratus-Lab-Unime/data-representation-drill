// The steps that turn a decimal number into IEEE 754 single precision, listed as
// the course slides list them (sign, integer part, fractional part, normalisation,
// exponent, mantissa) and closed by the three fields s | e | m in boxes.

import { line, mathText, rect, svg, text } from './svg.js';

const CHAR = 13.4;
const LABEL_CHAR = 7.8; // average width of a character of the label font
const ROW = 34;
const LEFT = 20;
const LABEL_WIDTH = 176;
const TOP = 34;
const BOX_PAD = 9;

const DEFAULT_LABELS = {
  sign: 'Segno',
  integerPart: 'Parte intera',
  fractionPart: 'Parte frazionaria',
  normalization: 'Normalizzazione',
  exponent: 'Esponente',
  mantissa: 'Mantissa',
  roundUp: 'Il bit successivo è 1: si arrotonda per eccesso',
  truncate: 'Il bit successivo è 0: si tronca',
  padding: 'completata con {count} zeri fino a 23 bit',
  fields: { s: 's', e: 'e', m: 'm' },
};

/** `working` comes from ieee754Working(); returns SVG markup. */
export function drawIeeeSteps(working, { title = '', labels = DEFAULT_LABELS } = {}) {
  const w = working;
  const mathX = LEFT + LABEL_WIDTH;
  const dots = w.next === null ? '' : '…'; // the fraction goes on beyond the bits shown
  const point = w.fractionBits === '' && w.next === null ? '' : '.';

  // Each step: a label and one or more lines of parts for mathText.
  const steps = [
    [labels.sign, [[`s = ${w.sign}`]]],
    [labels.integerPart, [[w.integerDecimal, { sub: '10' }, ' = ', w.integerBits, { sub: '2' }]]],
    [
      labels.fractionPart,
      [[w.fractionDecimal, { sub: '10' }, ' = ', `${w.fractionBits}${dots}`, { sub: '2' }]],
    ],
    [
      labels.normalization,
      [
        [`${w.integerBits}${point}${w.fractionBits}${dots}`],
        ['→ ', `1.${w.kept}`, ' × 2', { sup: String(w.power) }],
        [`p = ${w.power}`],
      ],
    ],
  ];
  if (w.rounding !== 'exact') {
    steps.push(['', [[{ label: w.rounding === 'rounded-up' ? labels.roundUp : labels.truncate }]]]);
  }
  steps.push([
    labels.exponent,
    [[`e = p + 127 = ${w.power} + 127 = ${w.exponentValue}`], ['= ', w.exponent, { sub: '2' }]],
  ]);
  const mantissaLines = [[`m = ${w.kept}`]];
  if (w.rounding === 'rounded-up') mantissaLines.push([`+ 1 = ${w.mantissa}`]);
  if (w.padding > 0) mantissaLines.push([{ label: labels.padding.replace('{count}', String(w.padding)) }]);
  steps.push([labels.mantissa, mantissaLines]);

  const out = [];
  let row = 0;
  let widest = 0;
  for (const [label, lines] of steps) {
    if (label) out.push(text(LEFT, TOP + row * ROW, label, { cls: 'fid-label' }));
    for (const parts of lines) {
      out.push(mathText(mathX, TOP + row * ROW, parts));
      // monospace parts are CHAR wide per character, label words in the narrower sans font
      const width = parts.reduce((sum, part) => {
        const [kind, content] = typeof part === 'string' ? ['mono', part] : Object.entries(part)[0];
        return sum + String(content).length * (kind === 'label' ? LABEL_CHAR : CHAR);
      }, 0);
      widest = Math.max(widest, width);
      row += 1;
    }
  }

  // the three fields in boxes: s | e | m
  const boxTop = TOP + row * ROW + 6;
  const boxHeight = 42;
  const sizes = [1, 8, 23];
  const fields = [w.sign, w.exponent, w.mantissa];
  const names = [labels.fields.s, labels.fields.e, labels.fields.m];
  const boxesWidth = sizes.reduce((sum, n) => sum + n * CHAR + 2 * BOX_PAD, 0);
  out.push(rect(mathX, boxTop, boxesWidth, boxHeight));
  let x = mathX;
  fields.forEach((bits, i) => {
    const width = sizes[i] * CHAR + 2 * BOX_PAD;
    if (i > 0) out.push(line(x, boxTop, x, boxTop + boxHeight));
    out.push(text(x + BOX_PAD, boxTop + 29, bits));
    out.push(text(x + width / 2, boxTop + boxHeight + 24, names[i], { cls: 'fid-label', anchor: 'middle' }));
    x += width;
  });

  return svg(mathX + Math.max(widest, boxesWidth) + 24, boxTop + boxHeight + 44, out.join(''), title);
}
