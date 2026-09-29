// Release guard. Checks that the files that make up the app can be copied as-is
// into another site (relative paths only, no external hosts, no build step) and
// that no Moodle question-bank material is present anywhere in the repository.
//
// Usage: node tools/check-release.mjs        (exit code 1 if anything is wrong)

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The app is index.html plus these folders. Everything else (tests, tools,
// docs) is repository-only and is never part of a release.
export const RELEASE_ENTRIES = ['index.html', 'app', 'engine', 'course'];

// Namespace identifiers, not network requests.
const ALLOWED_URLS = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink'];

// Every key written to web storage must start with this, to avoid clashing with
// the host site.
const STORAGE_PREFIX = 'fid-';

// Structural markers of a Moodle XML export. Assembled at runtime so that this
// file does not contain them literally and does not flag itself.
export const MOODLE_MARKERS = [
  ['<qui', 'z>'],
  ['$cour', 'se$/top/'],
  ['<question ty', 'pe='],
  ['moodle_aut', 'o_format'],
  ['shuffleans', 'wers'],
].map((parts) => parts.join(''));

const WALK_SKIP = new Set(['.git', 'node_modules', 'local']);

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function walk(root, rel) {
  const out = [];
  for (const name of readdirSync(path.join(root, rel))) {
    if (WALK_SKIP.has(name)) continue;
    const child = rel ? `${rel}/${name}` : name;
    if (statSync(path.join(root, child)).isDirectory()) out.push(...walk(root, child));
    else out.push(child);
  }
  return out;
}

// Files that git would publish: tracked plus untracked-and-not-ignored. Outside a
// git checkout, fall back to walking the directory.
function listFiles(root) {
  const git = spawnSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z'], {
    encoding: 'utf8',
  });
  const top = spawnSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  const isRoot = top.status === 0 && path.resolve(top.stdout.trim()) === path.resolve(root);
  const files = git.status === 0 && isRoot ? git.stdout.split('\0').filter(Boolean) : walk(root, '');
  return files.filter((f) => existsSync(path.join(root, f)));
}

const inRelease = (rel) =>
  RELEASE_ENTRIES.some((entry) => rel === entry || rel.startsWith(`${entry}/`));

function classify(value) {
  const v = value.trim();
  if (v === '' || v.startsWith('#')) return 'skip';
  if (v.startsWith('//')) return 'external'; // protocol-relative: some other host
  if (v.startsWith('/')) return 'absolute';
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v);
  if (scheme) {
    if (ALLOWED_URLS.includes(v)) return 'skip';
    return /^(https?|ftp|wss?)$/i.test(scheme[1]) ? 'external' : 'skip'; // data:, mailto:, ...
  }
  return 'relative';
}

function checkRef(ctx, value, index) {
  const kind = classify(value);
  if (kind === 'absolute') ctx.add(index, `absolute path "${value}" (use a relative path)`);
  else if (kind === 'external') ctx.add(index, `external URL "${value}"`);
  else if (kind === 'relative') {
    const target = path.join(path.dirname(ctx.abs), value.split(/[?#]/)[0]);
    if (!existsSync(target)) ctx.add(index, `referenced file not found: "${value}"`);
  }
}

function checkHtml(ctx) {
  const { text } = ctx;
  if (/^﻿?---/.test(text)) ctx.add(0, 'front matter: Jekyll would process this file');
  for (const m of text.matchAll(/\b(?:src|href|action|poster|data)\s*=\s*(["'])(.*?)\1/gis)) {
    checkRef(ctx, m[2], m.index);
  }
  for (const m of text.matchAll(/<base\b/gi)) ctx.add(m.index, '<base> tag');
  for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/i.test(m[1]) && m[2].trim()) ctx.add(m.index, 'inline script');
  }
  for (const m of text.matchAll(/<style\b/gi)) ctx.add(m.index, '<style> element');
  for (const m of text.matchAll(/\sstyle\s*=/gi)) ctx.add(m.index, 'inline style attribute');
  for (const m of text.matchAll(/\son[a-z]+\s*=/gi)) ctx.add(m.index, 'inline event handler');
}

function checkExternalSweep(ctx) {
  for (const m of ctx.text.matchAll(/\b(?:https?|wss?):\/\/[^\s'"`)<>]*/gi)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (!ALLOWED_URLS.includes(url)) ctx.add(m.index, `external URL "${url}"`);
  }
}

function checkCss(ctx) {
  for (const m of ctx.text.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) checkRef(ctx, m[2], m.index);
  for (const m of ctx.text.matchAll(/@import\s+(["'])(.*?)\1/gi)) checkRef(ctx, m[2], m.index);
  checkExternalSweep(ctx);
}

function checkJs(ctx) {
  const specifiers = [
    /\bfrom\s*(["'])(.*?)\1/g,
    /\bimport\s*\(\s*(["'])(.*?)\1/g,
    /\bimport\s*(["'])(.*?)\1/g,
    /\bfetch\s*\(\s*(["'])(.*?)\1/g,
    /\bnew\s+(?:URL|Worker)\s*\(\s*(["'])(.*?)\1/g,
  ];
  for (const re of specifiers) {
    for (const m of ctx.text.matchAll(re)) {
      if (/^[^./#]/.test(m[2]) && classify(m[2]) === 'relative') {
        ctx.add(m.index, `bare specifier "${m[2]}" cannot be resolved by the browser`);
      } else {
        checkRef(ctx, m[2], m.index);
      }
    }
  }
  for (const m of ctx.text.matchAll(/\bserviceWorker\b/g)) ctx.add(m.index, 'service worker');
  const keys = /\b(?:local|session)Storage\.(?:get|set|remove)Item\(\s*(["'`])(.*?)\1/g;
  for (const m of ctx.text.matchAll(keys)) {
    if (!m[2].startsWith(STORAGE_PREFIX)) {
      ctx.add(m.index, `web storage key "${m[2]}" must start with "${STORAGE_PREFIX}"`);
    }
  }
  checkExternalSweep(ctx);
}

/** Returns a list of { file, line, message }; empty means the tree is clean. */
export function checkTree(root) {
  const problems = [];
  const files = listFiles(root);

  if (!existsSync(path.join(root, 'index.html'))) {
    problems.push({ file: 'index.html', line: 0, message: 'missing' });
  }

  for (const rel of files) {
    const abs = path.join(root, rel);
    const add = (text) => (index, message) =>
      problems.push({ file: rel, line: index ? lineOf(text, index) : 1, message });

    if (/\.xml$/i.test(rel) || /moodle/i.test(path.basename(rel))) {
      problems.push({ file: rel, line: 0, message: 'Moodle material must not be in the repository' });
    }

    const buffer = readFileSync(abs);
    if (buffer.includes(0)) continue; // binary: only the name check applies
    const text = buffer.toString('utf8');

    for (const marker of MOODLE_MARKERS) {
      const at = text.indexOf(marker);
      if (at !== -1) {
        problems.push({ file: rel, line: lineOf(text, at), message: 'looks like a Moodle export' });
        break;
      }
    }

    if (!inRelease(rel)) continue;

    if (rel.split('/').some((segment) => segment.startsWith('_'))) {
      problems.push({ file: rel, line: 0, message: 'name starts with "_" (Jekyll skips it)' });
    }

    const ctx = { abs, rel, text, add: add(text) };
    if (/\.html?$/i.test(rel)) checkHtml(ctx);
    else if (/\.css$/i.test(rel)) checkCss(ctx);
    else if (/\.m?js$/i.test(rel)) checkJs(ctx);
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const problems = checkTree(root);
  for (const p of problems) console.error(`${p.file}${p.line ? `:${p.line}` : ''}: ${p.message}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s) found.`);
    process.exit(1);
  }
  console.log('Release check passed.');
}
