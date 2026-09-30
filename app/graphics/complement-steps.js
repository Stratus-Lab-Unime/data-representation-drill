// The steps that turn a negative integer into sign and magnitude, one's
// complement or two's complement, listed like the steps of the IEEE 754 drawing:
// a label on the left and the calculation on the right. Two's complement ends
// with the addition of 1 written in columns, with its carries. Bit strings are
// written as they are in the answer, without gaps, so they can be compared.

import { line, mathText, svg, text } from './svg.js';

const CHAR = 13.4; // width of one monospace character
const LABEL_CHAR = 7.8; // average width of a character of the label font
const ROW = 34;
const LEFT = 20;
const LABEL_WIDTH = 150;
const TOP = 34;
const NBSP = ' '; // keeps the columns of the addition aligned: SVG collapses ordinary spaces

const DEFAULT_LABELS = {
  sign: 'Segno',
  magnitude: 'Modulo',
  fill: 'Riempimento',
  invert: 'Inversione',
  carries: 'Riporti',
  addOne: 'Somma di 1',
  result: 'Risultato',
  negativeNumber: 'numero negativo',
  signBit: 'bit di segno',
  fromTable: 'dalla tabella qui sopra',
  fillBits: '{count} bit, con zeri a sinistra',
  invertRule: 'ogni 0 diventa 1 e ogni 1 diventa 0',
};

/** `working` comes from complementWorking(); returns SVG markup. */
export function drawComplementSteps(working, { title = '', labels = DEFAULT_LABELS } = {}) {
  const w = working;
  const rows = []; // { label, parts, rule }: one line each; `rule` draws a line under it
  const add = (label, parts, rule = false) => rows.push({ label, parts, rule });

  const negative = w.scheme === 'ms' ? `${labels.signBit} 1` : labels.negativeNumber;
  add(labels.sign, [`${w.value} < 0`, { label: ` → ${negative}` }]);
  add(labels.magnitude, [`|${w.value}| = ${w.magnitude}`]);
  add('', [w.magnitude, { sub: '10' }, ' = ', w.magnitudeBits, { sub: '2' }, { label: `  (${labels.fromTable})` }]);
  add(labels.fill, [w.filled, { label: `  ${labels.fillBits.replace('{count}', String(w.filled.length))}` }]);

  if (w.scheme === 'ms') {
    add(labels.result, ['1', NBSP, w.filled]);
    add('', [`=${NBSP}${w.result}`]);
  } else {
    add(labels.invert, [w.inverted]);
    add('', [{ label: labels.invertRule }]);
    if (w.scheme === 'c1') {
      add(labels.result, [w.result]);
    } else {
      const indent = NBSP + NBSP;
      if (w.carries.includes('1')) add(labels.carries, [indent + w.carries.replaceAll('0', NBSP)]);
      add(labels.addOne, [indent + w.inverted]);
      add('', [`+${NBSP}${w.addend}`], true);
      add('', [`=${NBSP}${w.sum}`]);
      add(labels.result, [w.result]);
    }
  }

  const mathX = LEFT + LABEL_WIDTH;
  const y = (row) => TOP + row * ROW;
  const out = [];
  let widest = 0;
  rows.forEach(({ label, parts, rule }, i) => {
    if (label) out.push(text(LEFT, y(i), label, { cls: 'fid-label' }));
    out.push(mathText(mathX, y(i), parts));
    // monospace parts are CHAR wide per character, label words in the narrower sans font
    const width = parts.reduce((sum, part) => {
      const [kind, content] = typeof part === 'string' ? ['mono', part] : Object.entries(part)[0];
      return sum + String(content).length * (kind === 'label' ? LABEL_CHAR : CHAR);
    }, 0);
    widest = Math.max(widest, width);
    if (rule) out.push(line(mathX, y(i) + 8, mathX + width, y(i) + 8));
  });

  return svg(mathX + widest + 24, y(rows.length) + 4, out.join(''), title);
}
