// The staircase of successive divisions, laid out like the course slides: each
// dividend sits left of a vertical bar with its divisor to the right, the next
// quotient is written under the divisor and the remainder (red) under the
// dividend. A green arrow shows that remainders are read from the last to the
// first.

import { arrow, line, svg, text } from './svg.js';

const FONT = 22;
const CHAR = 13.4; // width of one monospace character at FONT
const ROW = 34;
const PAD = 7;
const LEFT = 36;
const TOP = 34;

/** `table` comes from successiveDivisions(); returns SVG markup. */
export function drawDivisionTable(table, { title = '' } = {}) {
  const width = (s) => s.length * CHAR;
  const y = (row) => TOP + row * ROW;
  const out = [];

  let left = LEFT;
  const bars = [];
  table.rows.forEach((row, k) => {
    const bar = left + width(row.dividend) + PAD;
    bars.push(bar);
    out.push(text(left, y(k), row.dividend));
    out.push(line(bar, y(k) - FONT + 2, bar, y(k) + 6));
    out.push(text(bar + PAD, y(k), row.divisor));
    out.push(line(bar, y(k) + 6, bar + PAD + width(row.divisor) + PAD, y(k) + 6));
    out.push(text(bar - PAD, y(k + 1), row.remainder, { cls: 'fid-rem', anchor: 'end' }));
    left = bar + PAD; // the next quotient starts under the divisor
  });

  const count = table.rows.length;
  out.push(text(count ? left : LEFT, y(count), count ? '0' : table.value));

  if (count >= 2) {
    const first = table.rows[0].remainder;
    const last = table.rows[count - 1].remainder;
    const fromX = bars[count - 1] - PAD - width(last) / 2;
    const toX = bars[0] - PAD - width(first) - 16; // stop short of the first remainder
    out.push(arrow(fromX, y(count) + 12, toX, y(1) - 8, 'green'));
  }

  const captionY = y(count) + 56;
  out.push(
    `<text class="fid-text fid-caption" x="${LEFT}" y="${captionY}">${table.value}` +
      `<tspan class="fid-sub" dy="6">10</tspan><tspan dy="-6"> = ${table.result}</tspan>` +
      `<tspan class="fid-sub" dy="6">${table.base}</tspan></text>`,
  );

  const totalWidth = Math.max((count ? left : LEFT) + CHAR + 24, LEFT + width(`${table.value}10 = ${table.result}2`) + 24);
  return svg(totalWidth, captionY + 18, out.join(''), title);
}
