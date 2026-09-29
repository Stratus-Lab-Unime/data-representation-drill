// Binary long division, laid out like the course slides: dividend under an
// overline, divisor to its right under a bar, the quotient under the divisor,
// and on the left one subtrahend row and one remainder row per quotient digit,
// with red arrows for the bits brought down. Quotient and final remainder are
// circled in red and named. No minus signs are drawn, on purpose: the course
// promised its students a drawing without them.

import { remainderRow } from '../../engine/division.js';
import { arrow, ellipse, line, svg, text } from './svg.js';

const FONT = 24;
const CELL = 26; // width of one digit column
const ROW = 36;
const LEFT = 56;
const TOP = 44;

const DEFAULT_LABELS = { quotient: 'Quoziente', remainder: 'Resto' };

/** `model` comes from binaryLongDivision(); returns SVG markup. */
export function drawLongDivision(model, { title = '', labels = DEFAULT_LABELS } = {}) {
  const digits = model.dividend.length;
  const centre = (col) => LEFT + col * CELL + CELL / 2;
  const rowY = (row) => TOP + (row + 1) * ROW; // baseline of a row under the dividend
  const bar = LEFT + digits * CELL + 10;
  const rightStart = bar + 12;
  const rows = model.steps.length * 2;
  const bottom = rowY(rows) + 8;
  const out = [];

  // dividend, overline and the vertical bar. The overline covers only the first
  // digits, those the divisor "enters" (the first partial dividend).
  const covered = model.steps.length ? model.steps[0].col + 1 : digits;
  [...model.dividend].forEach((d, i) => out.push(text(centre(i), TOP, d, { anchor: 'middle' })));
  out.push(line(LEFT - 2, TOP - FONT + 2, LEFT + covered * CELL - 2, TOP - FONT + 2));
  out.push(line(bar, TOP - FONT + 2, bar, Math.max(bottom, TOP + ROW + 20)));

  // divisor and quotient
  [...model.divisor].forEach((d, i) => out.push(text(rightStart + i * CELL + CELL / 2, TOP, d, { anchor: 'middle' })));
  out.push(line(bar, TOP + 8, rightStart + model.divisor.length * CELL + 8, TOP + 8));
  [...model.quotient].forEach((d, i) => out.push(text(rightStart + i * CELL + CELL / 2, TOP + ROW, d, { anchor: 'middle' })));

  const ringY = (baseline) => baseline - FONT * 0.32;
  const quotientMid = rightStart + (model.quotient.length * CELL) / 2;
  const quotientRadius = (model.quotient.length * CELL) / 2 + 10;
  out.push(ellipse(quotientMid, ringY(TOP + ROW), quotientRadius, 20));
  const quotientLabelX = quotientMid + quotientRadius + 22;
  out.push(text(quotientLabelX, TOP + ROW + 46, labels.quotient, { cls: 'fid-label' }));
  out.push(arrow(quotientLabelX + 14, TOP + ROW + 30, quotientMid + quotientRadius - 6, ringY(TOP + ROW) + 16, 'blue'));

  // one subtrahend row and one remainder row per step
  let lastRow = null;
  model.steps.forEach((step, i) => {
    const subtrahendRow = 2 * i;
    const remainderRowIndex = 2 * i + 1;

    const size = step.subtrahend.length;
    [...step.subtrahend].forEach((d, k) => {
      out.push(text(centre(step.col - (size - 1 - k)), rowY(subtrahendRow), d, { anchor: 'middle' }));
    });
    const span = step.width;
    out.push(line(centre(step.col - span + 1) - CELL / 2, rowY(subtrahendRow) + 8, centre(step.col) + CELL / 2, rowY(subtrahendRow) + 8));

    const written = remainderRow(step);
    const last = step.next === null;
    const col = last ? step.col : step.col + 1;
    [...written].forEach((d, k) => {
      out.push(text(centre(col - (written.length - 1 - k)), rowY(remainderRowIndex), d, { anchor: 'middle' }));
    });
    if (last) {
      lastRow = { col, baseline: rowY(remainderRowIndex), digits: step.remainder.length };
    } else {
      out.push(arrow(centre(col), TOP + 10, centre(col), rowY(remainderRowIndex) - FONT + 4, 'red'));
    }
  });

  // final remainder: only its significant digits are circled, not the leading zeros
  let extraWidth = 0;
  if (lastRow) {
    const mid = centre(lastRow.col - (lastRow.digits - 1) / 2);
    const radius = (lastRow.digits * CELL) / 2 + 6;
    out.push(ellipse(mid, ringY(lastRow.baseline), radius, 20));
    const labelX = bar + 40;
    out.push(text(labelX, lastRow.baseline + 6, labels.remainder, { cls: 'fid-label' }));
    out.push(arrow(labelX - 6, lastRow.baseline + 2, mid + radius + 4, ringY(lastRow.baseline) + 6, 'blue'));
    extraWidth = 0;
  }

  const width = Math.max(quotientLabelX + 110, bar + 40 + 90) + extraWidth;
  const height = Math.max(bottom, TOP + ROW + 70) + 24;
  return svg(width, height, out.join(''), title);
}
