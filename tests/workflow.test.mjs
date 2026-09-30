import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The workflow that publishes the page to the lab site. There is no YAML parser in
// Node, so these are checks on its text; they defend what must never change by accident.

const file = path.resolve(fileURLToPath(new URL('..', import.meta.url)), '.github/workflows/publish-to-site.yml');
const text = readFileSync(file, 'utf8');
const lines = text.split('\n');
const code = lines.filter((line) => !line.trim().startsWith('#')).join('\n'); // the file without its comments

// the lines of a top-level block such as `on:`, up to the next top-level key
function block(name) {
  const start = lines.findIndex((line) => line === `${name}:`);
  assert.ok(start >= 0, `no top-level "${name}:"`);
  const out = [];
  for (let i = start + 1; i < lines.length && (lines[i] === '' || /^\s/.test(lines[i]) || lines[i].startsWith('#')); i++) out.push(lines[i]);
  return out.filter((line) => line.trim() && !line.trim().startsWith('#')).join('\n');
}

test('it runs when a release is published, and on nothing else', () => {
  assert.equal(block('on'), '  release:\n    types: [released]');
  assert.doesNotMatch(code, /^\s*(push|pull_request|schedule|workflow_dispatch):/m);
});

test('it can only read this repository and never runs two publications at once', () => {
  assert.equal(block('permissions'), '  contents: read');
  assert.match(block('concurrency'), /group: publish-to-site/);
  assert.match(block('concurrency'), /cancel-in-progress: false/);
});

test('it writes to the right folder of the right repository', () => {
  assert.match(block('env'), /SITE_REPOSITORY: Stratus-Lab-Unime\/stratus-lab-unime\.github\.io$/m);
  assert.match(block('env'), /SITE_DIRECTORY: teaching\/courses\/fondamenti-di-informatica\/esercizi$/m);
});

test('the token is used once, to check out the site', () => {
  assert.equal(code.split('secrets.SITE_REPO_TOKEN').length - 1, 1);
  const checkout = code.indexOf('repository: ${{ env.SITE_REPOSITORY }}');
  assert.ok(checkout > 0);
  assert.ok(code.indexOf('token: ${{ secrets.SITE_REPO_TOKEN }}') > checkout);
});

test('nothing is copied before the tests and the release check have passed', () => {
  const order = [
    'node --test "tests/*.test.mjs"',
    'node tools/check-release.mjs',
    'node tools/export-release.mjs',
    'repository: ${{ env.SITE_REPOSITORY }}',
    'rsync -a --delete',
    'git push',
  ].map((step) => code.indexOf(step));
  assert.ok(order.every((index) => index > 0), `missing step: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('values from the event go through the environment, never into a script', () => {
  let inside = false;
  lines.forEach((line, i) => {
    if (/^\s+run:/.test(line)) {
      assert.doesNotMatch(line, /\$\{\{/, `line ${i + 1}`);
      inside = /run:\s*\|/.test(line);
    } else if (inside && (line.trim() === '' || /^\s{10,}/.test(line))) {
      assert.doesNotMatch(line, /\$\{\{/, `line ${i + 1}`);
    } else {
      inside = false;
    }
  });
});

test('the copy only removes files inside the folder of the page', () => {
  assert.match(code, /rsync -a --delete "\$\{RUNNER_TEMP\}\/page\/" "site\/\$\{SITE_DIRECTORY\}\/"/);
  assert.match(code, /git add -A -- "\$\{SITE_DIRECTORY\}"/);
});
