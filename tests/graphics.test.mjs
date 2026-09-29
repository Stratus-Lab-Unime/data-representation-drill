import { test } from 'node:test';
import assert from 'node:assert/strict';
import { binaryLongDivision, remainderRow, successiveDivisions } from '../engine/division.js';
import { drawDivisionTable } from '../app/graphics/division-table.js';
import { drawLongDivision } from '../app/graphics/long-division.js';
import { escapeXml, text } from '../app/graphics/svg.js';

const count = (markup, pattern) => (markup.match(pattern) ?? []).length;
const texts = (markup) => [...markup.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map((m) => m[1]);

function assertWellFormed(markup) {
  assert.match(markup, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="fid-svg"/);
  assert.ok(markup.endsWith('</svg>'));
  assert.doesNotMatch(markup, /NaN|undefined|Infinity|null/);
  // content security policies and theming: no inline styles, scripts or links
  assert.doesNotMatch(markup, /\sstyle=|<style|<script|href=|on[a-z]+=/i);
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(markup).map(Number);
  assert.ok(w > 0 && h > 0);
  assert.match(markup, new RegExp(`width="${w}" height="${h}"`));
  for (const m of markup.matchAll(/\b(x|x1|x2|cx)="(-?[\d.]+)"/g)) {
    assert.ok(Number(m[2]) >= 0 && Number(m[2]) <= w, `${m[1]}=${m[2]} outside width ${w}`);
  }
  for (const m of markup.matchAll(/\b(y|y1|y2|cy)="(-?[\d.]+)"/g)) {
    assert.ok(Number(m[2]) >= 0 && Number(m[2]) <= h, `${m[1]}=${m[2]} outside height ${h}`);
  }
}

test('helpers escape text', () => {
  assert.equal(escapeXml(`<a href="x">&`), '&lt;a href=&quot;x&quot;&gt;&amp;');
  assert.doesNotMatch(text(0, 0, '<b>'), /<b>/);
  assert.match(drawLongDivision(binaryLongDivision(59, 5), { title: '<x>' }), /<title>&lt;x&gt;<\/title>/);
});

test('the division table for 845 by 2 has the numbers of the slide in order', () => {
  const table = successiveDivisions(845, 2);
  const markup = drawDivisionTable(table, { title: 'Divisioni successive' });
  assertWellFormed(markup);
  const written = texts(markup);
  // per row: dividend, divisor, remainder; then the final 0 and the caption
  assert.equal(written.length, 3 * 10 + 2);
  assert.deepEqual(
    written.slice(0, 9),
    ['845', '2', '1', '422', '2', '0', '211', '2', '1'],
  );
  assert.equal(written[30], '0');
  assert.equal(count(markup, /class="fid-text fid-rem"/g), 10);
  assert.equal(count(markup, /fid-head-green/g), 1);
  assert.match(markup, /845<tspan[^>]*>10<\/tspan><tspan[^>]*> = 1101001101<\/tspan><tspan[^>]*>2<\/tspan>/);
});

test('hexadecimal tables show decimal remainders and the letter result', () => {
  const markup = drawDivisionTable(successiveDivisions(63, 16));
  assertWellFormed(markup);
  assert.ok(texts(markup).includes('15'));
  assert.match(markup, / = 3F<\/tspan>/);
});

test('small and empty tables still draw', () => {
  const single = drawDivisionTable(successiveDivisions(1, 2));
  assertWellFormed(single);
  assert.equal(count(single, /fid-head-green/g), 0); // one remainder: nothing to point along
  const zero = drawDivisionTable(successiveDivisions(0, 2));
  assertWellFormed(zero);
  assert.deepEqual(texts(zero).slice(0, 1), ['0']);
});

test('drawing is deterministic and the arrow stops before the first remainder', () => {
  const table = successiveDivisions(845, 2);
  assert.equal(drawDivisionTable(table), drawDivisionTable(table));
  const arrowLine = /<line class="fid-ln fid-ln-green" x1="[\d.]+" y1="[\d.]+" x2="([\d.]+)"/.exec(drawDivisionTable(table));
  const firstRemainder = /fid-rem" x="([\d.]+)" y="[\d.]+" text-anchor="end"/.exec(drawDivisionTable(table));
  assert.ok(Number(arrowLine[1]) < Number(firstRemainder[1]) - 13.4, 'arrow tip must be left of the remainder');
});

test('long division of 59 by 5 draws every row of the slide', () => {
  const model = binaryLongDivision(59, 5);
  const markup = drawLongDivision(model);
  assertWellFormed(markup);

  const rowTexts = model.steps.reduce((sum, s) => sum + s.subtrahend.length + remainderRow(s).length, 0);
  const expected = model.dividend.length + model.divisor.length + model.quotient.length + 2 + rowTexts;
  assert.equal(count(markup, /<text /g), expected);

  const written = texts(markup);
  assert.deepEqual(written.slice(0, 6), ['1', '1', '1', '0', '1', '1']); // dividend digits
  assert.ok(written.includes('Quoziente') && written.includes('Resto'));
  assert.equal(count(markup, /<ellipse /g), 2); // quotient and remainder circled
  assert.equal(count(markup, /fid-head-red/g), model.steps.length - 1); // one arrow per bit brought down
  assert.equal(count(markup, /fid-head-blue/g), 2); // labels point at the circles
});

test('no minus signs are drawn', () => {
  for (const [a, b] of [[59, 5], [17, 3], [50, 6], [18, 2], [255, 3]]) {
    const markup = drawLongDivision(binaryLongDivision(a, b));
    assert.doesNotMatch(markup, /[−–—]/);
    assert.ok(texts(markup).every((t) => !t.includes('-')), `${a}/${b}`);
  }
});

// x attribute of the dividend digits, in drawing order
const dividendCentres = (markup, digits) =>
  [...markup.matchAll(/<text class="fid-text " x="([\d.]+)"/g)].slice(0, digits).map((m) => Number(m[1]));

test('the overline covers only the digits the divisor enters', () => {
  for (const [a, b] of [[59, 5], [17, 3], [50, 6], [18, 2], [255, 3], [1000, 7]]) {
    const model = binaryLongDivision(a, b);
    const markup = drawLongDivision(model);
    const centres = dividendCentres(markup, model.dividend.length);
    const overline = /<line class="fid-ln" x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/.exec(markup);
    const [x1, x2] = [Number(overline[1]), Number(overline[2])];
    const firstCol = model.steps[0].col; // last digit of the first partial dividend
    assert.ok(x1 < centres[0], `${a}/${b}: starts before the first digit`);
    assert.ok(x2 > centres[firstCol], `${a}/${b}: reaches the last digit of the first partial dividend`);
    if (firstCol + 1 < centres.length) {
      assert.ok(x2 < centres[firstCol + 1], `${a}/${b}: stops before the next digit`);
    }
  }
});

test('when the divisor never enters, the overline covers the whole dividend', () => {
  const model = binaryLongDivision(3, 5);
  const markup = drawLongDivision(model);
  const centres = dividendCentres(markup, model.dividend.length);
  const overline = /<line class="fid-ln" x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/.exec(markup);
  assert.ok(Number(overline[2]) > centres.at(-1));
});

test('labels can be replaced', () => {
  const markup = drawLongDivision(binaryLongDivision(17, 3), { labels: { quotient: 'Quotient', remainder: 'Remainder' } });
  assertWellFormed(markup);
  assert.ok(texts(markup).includes('Quotient') && texts(markup).includes('Remainder'));
  assert.ok(!texts(markup).includes('Resto'));
});

test('long divisions of many sizes draw well-formed drawings', () => {
  for (const [a, b] of [[18, 2], [17, 3], [50, 6], [255, 3], [1000, 7], [4095, 15], [1, 1], [7, 7], [3, 5]]) {
    const markup = drawLongDivision(binaryLongDivision(a, b));
    assertWellFormed(markup);
    assert.equal(markup, drawLongDivision(binaryLongDivision(a, b)));
  }
});
