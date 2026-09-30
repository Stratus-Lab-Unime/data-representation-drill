// Copies the files of the page, and nothing else, into an empty folder: index.html
// and the folders named in RELEASE_ENTRIES of check-release.mjs, the same list the
// release check uses. Hidden files are left out.
//
// Usage: node tools/export-release.mjs <destination>

import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RELEASE_ENTRIES } from './check-release.mjs';

const isInside = (folder, file) => {
  const relative = path.relative(folder, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

/** Copies the release entries of `root` into `destination`, which must be empty or missing. Returns the entries copied. */
export function exportRelease(root, destination) {
  if (!existsSync(path.join(root, 'index.html'))) throw new Error(`index.html not found in ${root}`);
  if (RELEASE_ENTRIES.some((entry) => isInside(path.join(root, entry), destination))) {
    throw new Error('the destination is inside the files being copied');
  }
  if (existsSync(destination) && readdirSync(destination).length > 0) {
    throw new Error(`the destination is not empty: ${destination}`);
  }
  mkdirSync(destination, { recursive: true });

  const copied = [];
  for (const entry of RELEASE_ENTRIES) {
    const from = path.join(root, entry);
    if (!existsSync(from)) continue;
    cpSync(from, path.join(destination, entry), {
      recursive: true,
      filter: (source) => !path.basename(source).startsWith('.'),
    });
    copied.push(entry);
  }
  return copied;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const destination = process.argv[2];
  if (!destination) {
    console.error('Usage: node tools/export-release.mjs <destination>');
    process.exit(2);
  }
  try {
    const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const copied = exportRelease(root, path.resolve(destination));
    console.log(`Copied ${copied.join(', ')} to ${destination}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
