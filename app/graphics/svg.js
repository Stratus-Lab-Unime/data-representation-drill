// Tiny helpers that build SVG markup as strings. Colours and fonts come from CSS
// classes (see style.css), never from inline attributes, so themes and content
// security policies keep working. The functions are pure, so drawings can be
// tested without a browser.

const NS = 'http://www.w3.org/2000/svg';
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export const escapeXml = (value) => String(value).replace(/[&<>"]/g, (c) => ESCAPES[c]);

// One decimal is plenty for coordinates and keeps the markup short.
const f = (x) => Math.round(x * 10) / 10;

export function text(x, y, content, { cls = '', anchor = 'start' } = {}) {
  return `<text class="fid-text ${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${escapeXml(content)}</text>`;
}

const SHIFTS = { normal: 0, sub: 6, sup: -9 };

/**
 * One line of text made of parts: a string is plain (monospace) text, {sub} a
 * subscript, {sup} a superscript and {label} words in the sans-serif label font.
 */
export function mathText(x, y, parts, { cls = '' } = {}) {
  let shift = 0;
  const spans = parts.map((part) => {
    const kind = typeof part === 'string' ? 'normal' : Object.keys(part)[0];
    const content = typeof part === 'string' ? part : part[kind];
    const target = SHIFTS[kind] ?? 0;
    const dy = target - shift;
    shift = target;
    const spanClass = kind === 'sub' || kind === 'sup' ? ' class="fid-sub"' : kind === 'label' ? ' class="fid-label"' : '';
    return `<tspan${spanClass}${dy ? ` dy="${dy}"` : ''}>${escapeXml(content)}</tspan>`;
  });
  if (shift !== 0) spans.push(`<tspan dy="${-shift}"></tspan>`);
  return `<text class="fid-text ${cls}" x="${f(x)}" y="${f(y)}">${spans.join('')}</text>`;
}

export function rect(x, y, width, height, cls = 'fid-box') {
  return `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(height)}"/>`;
}

export function line(x1, y1, x2, y2, cls = 'fid-ln') {
  return `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
}

export function ellipse(cx, cy, rx, ry, cls = 'fid-ring') {
  return `<ellipse class="${cls}" cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"/>`;
}

/** A line with a filled arrowhead at (x2, y2). `color` is one of red, blue, green. */
export function arrow(x1, y1, x2, y2, color = 'blue', size = 9) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const back = (delta) => [x2 - size * Math.cos(angle + delta), y2 - size * Math.sin(angle + delta)];
  const [ax, ay] = back(0.45);
  const [bx, by] = back(-0.45);
  return (
    line(x1, y1, x2 - (size - 1) * Math.cos(angle), y2 - (size - 1) * Math.sin(angle), `fid-ln fid-ln-${color}`) +
    `<polygon class="fid-head fid-head-${color}" points="${f(x2)},${f(y2)} ${f(ax)},${f(ay)} ${f(bx)},${f(by)}"/>`
  );
}

export function svg(width, height, body, title = '') {
  const label = title ? `<title>${escapeXml(title)}</title>` : '';
  return (
    `<svg xmlns="${NS}" class="fid-svg" viewBox="0 0 ${f(width)} ${f(height)}" ` +
    `width="${f(width)}" height="${f(height)}" role="img">${label}${body}</svg>`
  );
}
