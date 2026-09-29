import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOODLE_MARKERS, checkTree } from '../tools/check-release.mjs';

const CLEAN = {
  'index.html':
    '<!doctype html><html><head><link rel="stylesheet" href="app/style.css"></head>' +
    '<body><script type="module" src="app/main.js"></script></body></html>',
  'app/style.css': '.fid-app { color: #000; }',
  'app/main.js': "const k = 'fid-x'; localStorage.setItem('fid-x', k);",
};

// Builds a throwaway tree, runs the check and returns the messages.
function messagesFor(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'fid-check-'));
  try {
    for (const [name, content] of Object.entries({ ...CLEAN, ...files })) {
      if (content === null) continue;
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), content);
    }
    return checkTree(root).map((p) => `${p.file}: ${p.message}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const flagged = (files, fragment) => messagesFor(files).some((m) => m.includes(fragment));

test('a clean tree passes', () => {
  assert.deepEqual(messagesFor({}), []);
});

test('flags absolute paths in html, css and js', () => {
  assert.ok(flagged({ 'index.html': '<script src="/app/main.js"></script>' }, 'absolute path'));
  assert.ok(flagged({ 'app/style.css': 'a { background: url(/img/x.png); }' }, 'absolute path'));
  assert.ok(flagged({ 'app/main.js': "import { a } from '/engine/a.js';" }, 'absolute path'));
});

test('flags external URLs, including protocol-relative ones', () => {
  assert.ok(flagged({ 'index.html': '<link rel="stylesheet" href="https://cdn.example/x.css">' }, 'external URL'));
  assert.ok(flagged({ 'index.html': '<script src="//cdn.example/x.js"></script>' }, 'external URL'));
  assert.ok(flagged({ 'app/style.css': "@import 'https://fonts.example/f.css';" }, 'external URL'));
  assert.ok(flagged({ 'app/main.js': "fetch('https://api.example/x')" }, 'external URL'));
});

test('allows the SVG namespace', () => {
  const js = "document.createElementNS('http://www.w3.org/2000/svg', 'svg');";
  assert.deepEqual(messagesFor({ 'app/main.js': js }), []);
});

test('flags front matter, <base>, inline script/style/handlers', () => {
  assert.ok(flagged({ 'index.html': '---\ntitle: x\n---\n<p>hi</p>' }, 'front matter'));
  assert.ok(flagged({ 'index.html': '<base href="/">' }, '<base>'));
  assert.ok(flagged({ 'index.html': '<script>alert(1)</script>' }, 'inline script'));
  assert.ok(flagged({ 'index.html': '<style>p{}</style>' }, '<style>'));
  assert.ok(flagged({ 'index.html': '<p style="color:red">x</p>' }, 'inline style'));
  assert.ok(flagged({ 'index.html': '<button onclick="go()">x</button>' }, 'event handler'));
});

test('flags missing referenced files and bare import specifiers', () => {
  assert.ok(flagged({ 'index.html': '<script src="app/missing.js"></script>' }, 'not found'));
  assert.ok(flagged({ 'app/main.js': "import x from 'lodash';" }, 'bare specifier'));
  assert.deepEqual(messagesFor({ 'app/a.js': 'export const a = 1;', 'app/main.js': "import { a } from './a.js';" }), []);
});

test('flags names starting with an underscore (Jekyll)', () => {
  assert.ok(flagged({ 'app/_private.js': 'export {};' }, 'Jekyll'));
});

test('flags service workers and unprefixed storage keys', () => {
  assert.ok(flagged({ 'app/main.js': "navigator.serviceWorker.register('sw.js');" }, 'service worker'));
  assert.ok(flagged({ 'app/main.js': "localStorage.getItem('progress');" }, 'must start with'));
});

test('flags Moodle material by file name and by content, anywhere', () => {
  assert.ok(flagged({ 'notes/bank.xml': '<a/>' }, 'Moodle material'));
  assert.ok(flagged({ 'docs/moodle-export.txt': 'x' }, 'Moodle material'));
  for (const marker of MOODLE_MARKERS) {
    assert.ok(flagged({ 'docs/data.txt': `x ${marker} y` }, 'Moodle export'), marker);
  }
});

test('release rules do not apply to repository-only files', () => {
  assert.deepEqual(messagesFor({ 'tests/page.html': '<script src="/x.js"></script>' }), []);
});

test('the real repository passes', () => {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  assert.deepEqual(checkTree(root), []);
});
