import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BYTES_PER_KB, imageWorking, textSizeWorking } from '../course/fondamenti-di-informatica/workings.js';
import { createRng } from '../engine/rng.js';

test('the size of a text: characters per page, characters in all, one byte each', () => {
  const w = textSizeWorking(3, 40, 50);
  assert.deepEqual(w, { pages: 3, rows: 40, chars: 50, perPage: 2000, characters: 6000, bytesPerCharacter: 1, bytes: 6000 });
  assert.equal(textSizeWorking(1, 10, 10).bytes, 100);
});

test('the text working agrees with the plain product for many values', () => {
  const rng = createRng(9);
  for (let i = 0; i < 500; i++) {
    const pages = rng.int(1, 9);
    const rows = rng.int(1, 120);
    const chars = rng.int(1, 120);
    const w = textSizeWorking(pages, rows, chars);
    assert.equal(w.perPage, rows * chars);
    assert.equal(w.characters, pages * w.perPage);
    assert.equal(w.bytes, pages * rows * chars);
  }
});

test('1 KB is 1024 bytes', () => {
  assert.equal(BYTES_PER_KB, 1024);
});

test('the numbers of an image: pixels, bytes and bits', () => {
  // 1024 x 512 pixels at 16 bits per pixel is exactly 1024 KB
  const w = imageWorking('kb', { width: 1024, height: 512, bits: 16, kb: 1024 });
  assert.deepEqual(w, {
    variant: 'kb', width: 1024, height: 512, bits: 16, colors: 65536, kb: 1024,
    pixels: 524288, bytes: 1048576, totalBits: 8388608,
  });
  assert.equal(imageWorking('colors', { width: 512, height: 256, bits: 8, kb: 128 }).colors, 256);
  assert.equal(imageWorking('bits', { width: 512, height: 256, bits: 1, kb: 16 }).colors, 2);
});

test('the image working is consistent for many images and refuses inconsistent ones', () => {
  const rng = createRng(21);
  for (let i = 0; i < 300; i++) {
    const width = 64 * rng.int(1, 40);
    const height = 64 * rng.int(1, 40);
    const bits = rng.pick([1, 2, 4, 8, 12, 16, 24]);
    const kb = (width * height * bits) / 8192; // whole because the sides are multiples of 64
    const w = imageWorking(rng.pick(['kb', 'base', 'height', 'bits', 'colors']), { width, height, bits, kb });
    assert.equal(w.pixels, width * height);
    assert.equal(w.bytes, kb * 1024);
    assert.equal(w.totalBits, w.bytes * 8);
    assert.equal(w.pixels * w.bits, w.totalBits);
    assert.equal(w.colors, 2 ** bits);
  }
  assert.throws(() => imageWorking('kb', { width: 100, height: 100, bits: 8, kb: 10 }), RangeError);
});
