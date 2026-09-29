import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  binaryLongDivision,
  countDigitInTable,
  countOnesInDivision,
  remainderRow,
  successiveDivisions,
  tableTexts,
} from '../engine/division.js';

const column = (table, key) => table.rows.map((r) => r[key]);

test('successive divisions of 845 by 2 give the table of the slides', () => {
  const table = successiveDivisions(845, 2);
  assert.equal(table.result, '1101001101');
  assert.deepEqual(column(table, 'dividend'), ['845', '422', '211', '105', '52', '26', '13', '6', '3', '1']);
  assert.deepEqual(column(table, 'quotient'), ['422', '211', '105', '52', '26', '13', '6', '3', '1', '0']);
  assert.deepEqual(column(table, 'remainder'), ['1', '0', '1', '1', '0', '0', '1', '0', '1', '1']);
  assert.ok(table.rows.every((r) => r.divisor === '2'));
});

test('hexadecimal remainders stay decimal in the table and letters only in the result', () => {
  const table = successiveDivisions(63, 16);
  assert.deepEqual(column(table, 'remainder'), ['15', '3']);
  assert.equal(table.result, '3F');
  assert.ok(table.rows.every((r) => r.divisor === '16'));
});

test('zero has no rows and the result is 0', () => {
  const table = successiveDivisions(0, 2);
  assert.deepEqual(table.rows, []);
  assert.equal(table.result, '0');
  assert.deepEqual(tableTexts(table), ['0']);
});

test('the rows chain: each dividend is the previous quotient, and they rebuild the value', () => {
  for (const [value, base] of [[845, 2], [1000, 2], [4095, 16], [1, 2], [255, 8], [99999n, 7]]) {
    const table = successiveDivisions(value, base);
    table.rows.forEach((row, k) => {
      if (k > 0) assert.equal(row.dividend, table.rows[k - 1].quotient);
      assert.equal(BigInt(row.dividend), BigInt(row.quotient) * BigInt(base) + BigInt(row.remainder));
    });
    assert.equal(table.rows.at(-1).quotient, '0');
    assert.equal(BigInt(`0`) + table.rows.reduceRight((acc, r) => acc * BigInt(base) + BigInt(r.remainder), 0n), BigInt(value));
  }
});

test('counting a digit covers dividends, quotients, remainders and divisors', () => {
  // The table of the slides for 845 by 2 has these numbers:
  //   845 422 211 105 52 26 13 6 3 1 0        (dividend and quotients)
  //   1 0 1 1 0 0 1 0 1 1                     (remainders)
  //   2 written ten times                     (divisors)
  const table = successiveDivisions(845, 2);
  assert.equal(countDigitInTable(table, 0), 1 + 1 + 4); // in 105, in 0, in four remainders
  assert.equal(countDigitInTable(table, 1), 5 + 6); // in 211, 105, 13, 1 (5 in all) and six remainders
  assert.equal(countDigitInTable(table, 2), 5 + 10); // in 422, 211, 52, 26 (5 in all) and ten divisors
  assert.equal(countDigitInTable(table, 5), 3);
  assert.equal(countDigitInTable(table, 7), 0);
  assert.equal(countDigitInTable(successiveDivisions(0, 2), 0), 1);
  assert.throws(() => countDigitInTable(table, 'F'), RangeError);
  assert.throws(() => countDigitInTable(table, 12), RangeError);
});

// Independent oracle: builds the text of the table with a plain loop.
function slowTableCount(value, base, digit) {
  let written = String(value);
  for (let n = value; n > 0; n = Math.floor(n / base)) {
    written += String(base) + String(n % base) + String(Math.floor(n / base));
  }
  return written.split(digit).length - 1;
}

test('digit counts agree with the oracle for many values, bases and digits', () => {
  for (let value = 0; value <= 600; value++) {
    for (const base of [2, 8, 16]) {
      const table = successiveDivisions(value, base);
      for (let digit = 0; digit <= 9; digit++) {
        assert.equal(countDigitInTable(table, digit), slowTableCount(value, base, String(digit)), `${value} base ${base} digit ${digit}`);
      }
    }
  }
});

test('rejects invalid input', () => {
  assert.throws(() => successiveDivisions(-1, 2), RangeError);
  assert.throws(() => successiveDivisions(5, 1), RangeError);
  assert.throws(() => binaryLongDivision(-1, 3), RangeError);
  assert.throws(() => binaryLongDivision(5, 0), RangeError);
});

test('binary long division of 59 by 5 matches the drawing in the slides', () => {
  const model = binaryLongDivision(59, 5);
  assert.equal(model.dividend, '111011');
  assert.equal(model.divisor, '101');
  assert.equal(model.quotient, '1011');
  assert.equal(model.remainder, '100');
  assert.deepEqual(model.steps.map((s) => s.subtrahend), ['101', '000', '101', '101']);
  // the rows of the slide, with a 0 where the slide has a minus sign
  assert.deepEqual(model.steps.map(remainderRow), ['0100', '1001', '01001', '0100']);
  assert.deepEqual(model.steps.map((s) => s.col), [2, 3, 4, 5]);
  assert.equal(countOnesInDivision(model), 22);
});

test('binary long division of 17 by 3 matches the drawing in the slides', () => {
  const model = binaryLongDivision(17, 3);
  assert.equal(model.quotient, '101');
  assert.equal(model.remainder, '10');
  assert.deepEqual(model.steps.map((s) => s.subtrahend), ['11', '00', '11']);
  assert.deepEqual(model.steps.map(remainderRow), ['0010', '101', '010']);
  assert.equal(countOnesInDivision(model), 14);
});

test('remainder rows keep their leading zeros: as wide as the number they come from, at least as wide as the divisor', () => {
  for (const [a, b] of [[59, 5], [17, 3], [18, 2], [50, 6], [1000, 7], [255, 3]]) {
    const model = binaryLongDivision(a, b);
    model.steps.forEach((s) => {
      assert.equal(s.width, Math.max(s.partial.length, model.divisor.length), `${a}/${b}`);
      const row = remainderRow(s);
      assert.equal(row.length, s.width + (s.next === null ? 0 : 1), `${a}/${b}`);
      assert.ok(row.length >= model.divisor.length, `${a}/${b}`);
      assert.equal(BigInt(`0b${row.slice(0, s.width)}`), BigInt(`0b${s.remainder}`)); // zeros only
    });
  }
});

test('when the dividend is smaller than the divisor there are no steps', () => {
  const model = binaryLongDivision(3, 5);
  assert.deepEqual(model.steps, []);
  assert.equal(model.quotient, '0');
  assert.equal(model.remainder, '11');
  assert.equal(countOnesInDivision(model), 2 + 2 + 0);
  assert.equal(binaryLongDivision(0, 5).remainder, '0');
});

// Independent oracle: the counting rule written as a plain loop over the bits.
function slowCount(dividend, divisor) {
  const pop = (n) => n.toString(2).split('').filter((c) => c === '1').length;
  const q = Math.floor(dividend / divisor);
  let total = pop(dividend) + pop(divisor) + pop(q);
  let rest = 0;
  let started = false;
  for (const bit of dividend.toString(2)) {
    rest = rest * 2 + Number(bit);
    if (started && bit === '1') total += 1; // bit brought down
    const takes = rest >= divisor;
    if (takes) rest -= divisor;
    if (takes) started = true;
    if (started) total += pop(takes ? divisor : 0) + pop(rest);
  }
  return total;
}

test('quotient, remainder and count agree with the oracle on a large grid', () => {
  for (let a = 0; a <= 400; a++) {
    for (let d = 1; d <= 45; d++) {
      const model = binaryLongDivision(a, d);
      assert.equal(BigInt(`0b${model.quotient}`), BigInt(Math.floor(a / d)), `${a}/${d}`);
      assert.equal(BigInt(`0b${model.remainder}`), BigInt(a % d), `${a}/${d}`);
      assert.equal(countOnesInDivision(model), slowCount(a, d), `${a}/${d}`);
    }
  }
});

test('each step is arithmetically consistent', () => {
  const model = binaryLongDivision(789, 11);
  model.steps.forEach((s, k) => {
    const partial = BigInt(`0b${s.partial}`);
    const sub = BigInt(`0b${s.subtrahend}`);
    const rem = BigInt(`0b${s.remainder}`);
    assert.equal(partial - sub, rem);
    assert.ok(rem < 11n);
    if (k > 0) {
      const before = model.steps[k - 1];
      assert.equal(partial, BigInt(`0b${before.remainder}`) * 2n + BigInt(before.next));
    }
  });
});
