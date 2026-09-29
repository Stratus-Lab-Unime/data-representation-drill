// The table of successive multiplications that turns a decimal fraction into
// fixed-point bits, laid out like the course slide: on each row the fraction, its
// double with an arrow, and the bit (the integer part of the double); a red arrow
// runs down the bits, the order in which they are read. Below, the result.

import { arrow, mathText, svg, text } from './svg.js';

const CHAR = 13.4; // width of one monospace character
const ROW = 34;
const LEFT = 24;
const TOP = 40;

const DEFAULT_LABELS = { truncated: '(continuerebbe con {bit}…, ma i {count} bit sono finiti)' };

/** `working` comes from fixedPointWorking(); returns SVG markup. */
export function drawFractionTable(working, { title = '', labels = DEFAULT_LABELS } = {}) {
  const rows = working.rows;
  const factors = rows.map((r) => `${r.factor} * 2 =`);
  const products = rows.map((r) => `${r.product} →`);
  const productStart = LEFT + Math.max(0, ...factors.map((s) => s.length)) * CHAR + 18;
  const bitX = productStart + Math.max(0, ...products.map((s) => s.length)) * CHAR + 38;
  const y = (i) => TOP + i * ROW;
  const out = [];

  rows.forEach((row, i) => {
    out.push(text(LEFT, y(i), factors[i]));
    out.push(text(productStart, y(i), products[i]));
    out.push(text(bitX, y(i), row.bit, { anchor: 'middle' }));
  });
  if (rows.length >= 2) out.push(arrow(bitX + 26, y(0) - 20, bitX + 26, y(rows.length - 1) + 6, 'red'));

  let next = rows.length;
  if (working.next !== null) {
    const note = labels.truncated.replace('{bit}', working.next).replace('{count}', String(rows.length));
    out.push(mathText(LEFT, y(next), [{ label: note }]));
    next += 1;
  }

  const result = `${working.sign}${working.integerBits}.${working.fraction}`;
  out.push(
    mathText(LEFT, y(next) + 14, [working.value, { sub: '10' }, ' = ', result, { sub: '2' }], { cls: 'fid-caption' }),
  );

  const captionWidth = LEFT + (working.value.length + 3 + result.length + 3) * CHAR;
  return svg(Math.max(bitX + 60, captionWidth + 20), y(next) + 40, out.join(''), title);
}
