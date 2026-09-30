import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryHref, codeHref, homeHref, parseRoute } from '../app/route.js';

test('an empty hash, # and #/ are the home page', () => {
  for (const hash of ['', '#', '#/', undefined, null]) assert.deepEqual(parseRoute(hash), { name: 'home' }, String(hash));
});

test('a category id is a route', () => {
  assert.deepEqual(parseRoute('#/dec-to-bin'), { name: 'category', id: 'dec-to-bin' });
  assert.deepEqual(parseRoute('#binary-division'), { name: 'category', id: 'binary-division' });
});

test('a question code is a route', () => {
  assert.deepEqual(parseRoute('#/q/dec-to-bin.1.00000P'), { name: 'code', code: 'dec-to-bin.1.00000P' });
  assert.deepEqual(parseRoute('#/q/a%20b'), { name: 'code', code: 'a b' });
});

test('anything else is unknown, including malformed escapes', () => {
  for (const hash of ['#/Dec-To-Bin', '#/a/b', '#/../x', '#/dec_to_bin', '#/q/%E0%A4%A', '#/1abc']) {
    assert.deepEqual(parseRoute(hash), { name: 'unknown' }, hash);
  }
});

test('hrefs and routes round-trip', () => {
  assert.deepEqual(parseRoute(homeHref), { name: 'home' });
  assert.deepEqual(parseRoute(categoryHref('fixed-point')), { name: 'category', id: 'fixed-point' });
  for (const code of ['dec-to-bin.1.00000P', 'x y/z?']) assert.deepEqual(parseRoute(codeHref(code)), { name: 'code', code });
});
