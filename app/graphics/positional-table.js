// The value of a binary number from its digits, as a table like the explicit form
// in the slides: under each digit its power of 2, that power written out, and the
// product of the two; below, the sum of the terms that are not zero.

import { line, mathText, svg, text } from './svg.js';

const CHAR = 13.4; // width of one monospace character
const SUP_CHAR = 8.4; // width of one character of a superscript
const ROW = 34;
const LEFT = 20;
const LABEL_WIDTH = 120;
const CELL = 58;
const TOP = 34;

const DEFAULT_LABELS = { digit: 'Cifra', power: 'Potenza di 2', weight: 'Peso', product: 'Prodotto', sum: 'Somma' };

/** `working` comes from binaryValueWorking(); returns SVG markup. */
export function drawPositionalTable(working, { title = '', labels = DEFAULT_LABELS } = {}) {
  const { columns, addends, value } = working;
  const gridX = LEFT + LABEL_WIDTH;
  const centre = (i) => gridX + i * CELL + CELL / 2;
  const y = (row) => TOP + row * ROW;
  const out = [];

  [labels.digit, labels.power, labels.weight, labels.product].forEach((label, row) => {
    out.push(text(LEFT, y(row), label, { cls: 'fid-label' }));
  });
  columns.forEach((c, i) => {
    out.push(text(centre(i), y(0), c.digit, { anchor: 'middle' }));
    const exponent = String(c.exponent);
    const width = CHAR + exponent.length * SUP_CHAR; // "2" and its exponent, centred as a whole
    out.push(mathText(centre(i) - width / 2, y(1), ['2', { sup: exponent }]));
    out.push(text(centre(i), y(2), String(c.weight), { anchor: 'middle' }));
    out.push(text(centre(i), y(3), String(c.product), { anchor: 'middle' }));
  });
  out.push(line(gridX, y(3) + 10, gridX + columns.length * CELL, y(3) + 10));

  const terms = addends.length ? addends.join(' + ') : '0';
  out.push(text(LEFT, y(4) + 10, labels.sum, { cls: 'fid-label' }));
  out.push(mathText(gridX, y(4) + 10, [`${terms} = ${value}`, { sub: '10' }]));

  const sumWidth = (terms.length + 3 + String(value).length + 2) * CHAR;
  return svg(gridX + Math.max(columns.length * CELL, sumWidth) + 20, y(4) + 30, out.join(''), title);
}
