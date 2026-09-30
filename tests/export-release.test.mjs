import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_ENTRIES, checkTree } from '../tools/check-release.mjs';
import { exportRelease } from '../tools/export-release.mjs';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function temporary(run) {
  const folder = mkdtempSync(path.join(tmpdir(), 'fid-export-'));
  try {
    return run(folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const listFiles = (folder, prefix = '') =>
  readdirSync(path.join(folder, prefix)).flatMap((name) => {
    const relative = prefix ? `${prefix}/${name}` : name;
    return statSync(path.join(folder, relative)).isDirectory() ? listFiles(folder, relative) : [relative];
  });

function write(root, files) {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), content);
  }
}

test('copies the files of the page and nothing else', () => {
  temporary((folder) => {
    const source = path.join(folder, 'source');
    write(source, {
      'index.html': '<p>page</p>',
      'app/main.js': 'a',
      'app/graphics/svg.js': 'b',
      'engine/index.js': 'c',
      'course/pack/index.js': 'd',
      'README.md': 'not part of the page',
      'tests/x.test.mjs': 'no',
      'tools/y.mjs': 'no',
      'spike/index.html': 'no',
      'package.json': 'no',
    });
    const destination = path.join(folder, 'out');
    assert.deepEqual(exportRelease(source, destination), RELEASE_ENTRIES);
    assert.deepEqual(listFiles(destination).sort(), [
      'app/graphics/svg.js', 'app/main.js', 'course/pack/index.js', 'engine/index.js', 'index.html',
    ]);
    assert.equal(readFileSync(path.join(destination, 'app/graphics/svg.js'), 'utf8'), 'b');
  });
});

test('leaves hidden files out and tolerates a missing folder', () => {
  temporary((folder) => {
    const source = path.join(folder, 'source');
    write(source, { 'index.html': 'x', 'app/main.js': 'a', 'app/.DS_Store': 'junk', '.secret': 'no' });
    const destination = path.join(folder, 'out');
    assert.deepEqual(exportRelease(source, destination), ['index.html', 'app']); // no engine, no course
    assert.deepEqual(listFiles(destination).sort(), ['app/main.js', 'index.html']);
  });
});

test('refuses a destination that is not empty, is inside the page, or a source without index.html', () => {
  temporary((folder) => {
    const source = path.join(folder, 'source');
    write(source, { 'index.html': 'x', 'app/main.js': 'a' });
    write(path.join(folder, 'full'), { 'old.txt': 'old' });
    assert.throws(() => exportRelease(source, path.join(folder, 'full')), /not empty/);
    assert.throws(() => exportRelease(source, path.join(source, 'app', 'out')), /inside/);
    assert.throws(() => exportRelease(path.join(folder, 'nothing'), path.join(folder, 'out')), /index\.html not found/);
    mkdirSync(path.join(folder, 'empty'));
    assert.doesNotThrow(() => exportRelease(source, path.join(folder, 'empty'))); // an empty folder is fine
  });
});

test('the real page exports exactly its tracked files and stands on its own', () => {
  temporary((folder) => {
    const destination = path.join(folder, 'page');
    exportRelease(repoRoot, destination);

    const tracked = spawnSync('git', ['-C', repoRoot, 'ls-files', '-z'], { encoding: 'utf8' }).stdout
      .split('\0')
      .filter((file) => file && RELEASE_ENTRIES.some((entry) => file === entry || file.startsWith(`${entry}/`)));
    assert.deepEqual(listFiles(destination).sort(), tracked.sort());

    // the exported folder passes the same rules: every reference resolves inside it
    assert.deepEqual(checkTree(destination).filter((problem) => problem.message.includes('Moodle') === false), []);
    for (const leftover of ['tests', 'tools', 'spike', 'README.md', 'package.json', 'local']) {
      assert.equal(listFiles(destination).some((file) => file === leftover || file.startsWith(`${leftover}/`)), false, leftover);
    }
  });
});
