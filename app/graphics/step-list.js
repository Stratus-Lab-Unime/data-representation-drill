// A list of steps drawn as a label on the left and the calculation on the right,
// the layout shared by the drawings of the calculations. A row is
// { label, parts }: `parts` are for mathText (a string is monospace text, {sub},
// {sup} and {label} are the other kinds); `rule: true` draws a line under it.

import { line, mathText, svg, text } from './svg.js';

const CHAR = 13.4; // width of one monospace character
const LABEL_CHAR = 7.8; // average width of a character of the label font
const ROW = 34;
const LEFT = 20;
const TOP = 34;

/** SVG markup for the rows; `labelWidth` is the width of the column of labels. */
export function drawStepList(rows, { title = '', labelWidth = 150 } = {}) {
  const mathX = LEFT + labelWidth;
  const y = (row) => TOP + row * ROW;
  const out = [];
  let widest = 0;
  rows.forEach(({ label, parts, rule }, i) => {
    if (label) out.push(text(LEFT, y(i), label, { cls: 'fid-label' }));
    out.push(mathText(mathX, y(i), parts));
    const width = parts.reduce((sum, part) => {
      const [kind, content] = typeof part === 'string' ? ['mono', part] : Object.entries(part)[0];
      return sum + String(content).length * (kind === 'label' ? LABEL_CHAR : CHAR);
    }, 0);
    widest = Math.max(widest, width);
    if (rule) out.push(line(mathX, y(i) + 8, mathX + width, y(i) + 8));
  });
  return svg(mathX + widest + 24, y(rows.length) + 4, out.join(''), title);
}
