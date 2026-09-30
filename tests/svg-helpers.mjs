import assert from 'node:assert/strict';

// Shared checks for the drawings, which are plain SVG strings.

export const count = (markup, pattern) => (markup.match(pattern) ?? []).length;

/** Inner markup of every <text> element, in drawing order. */
export const texts = (markup) => [...markup.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map((m) => m[1]);

/** The same, with the tspans removed: what a reader sees on each line. */
const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&amp;': '&' };
export const plainTexts = (markup) =>
  texts(markup).map((t) => t.replace(/<[^>]+>/g, '').replace(/&(lt|gt|quot|amp);/g, (e) => ENTITIES[e]));

/** x attributes of the <text> elements whose content, without tags, equals `content`. */
export const xOf = (markup, content) =>
  [...markup.matchAll(/<text\b[^>]*\bx="([\d.]+)"[^>]*>(.*?)<\/text>/g)]
    .filter((m) => m[2].replace(/<[^>]+>/g, '') === content)
    .map((m) => Number(m[1]));

export function assertWellFormed(markup) {
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
