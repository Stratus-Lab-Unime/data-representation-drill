// Exact rational numbers on BigInt, so that decimal input such as "-20,67" never
// passes through floating point. Instances are immutable and always normalised:
// the denominator is positive and the fraction is in lowest terms.

const absBig = (x) => (x < 0n ? -x : x);

function gcd(a, b) {
  a = absBig(a);
  b = absBig(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

const DECIMAL = /^([+\-−]?)(\d+)(?:[.,](\d+))?$/;

export class Fraction {
  constructor(numerator, denominator = 1n) {
    let n = BigInt(numerator); // throws for non-integer numbers
    let d = BigInt(denominator);
    if (d === 0n) throw new RangeError('Fraction: zero denominator');
    if (d < 0n) [n, d] = [-n, -d];
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
    Object.freeze(this);
  }

  /** Coerces a Fraction, bigint, integer number or decimal string. */
  static of(x) {
    if (x instanceof Fraction) return x;
    if (typeof x === 'string') return Fraction.parse(x);
    return new Fraction(x);
  }

  /** Parses decimal text: optional sign, digits, optional "." or "," and digits. */
  static parse(text) {
    const match = DECIMAL.exec(String(text).trim());
    if (!match) throw new SyntaxError(`Fraction.parse: not a decimal number: "${text}"`);
    const [, sign, whole, decimals = ''] = match;
    const magnitude = new Fraction(BigInt(whole + decimals), 10n ** BigInt(decimals.length));
    return sign === '-' || sign === '−' ? magnitude.neg() : magnitude;
  }

  add(other) {
    const o = Fraction.of(other);
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(other) {
    const o = Fraction.of(other);
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(other) {
    const o = Fraction.of(other);
    return new Fraction(this.n * o.n, this.d * o.d);
  }

  div(other) {
    const o = Fraction.of(other);
    if (o.n === 0n) throw new RangeError('Fraction: division by zero');
    return new Fraction(this.n * o.d, this.d * o.n);
  }

  neg() {
    return new Fraction(-this.n, this.d);
  }

  abs() {
    return new Fraction(absBig(this.n), this.d);
  }

  /** Multiplies by 2^k; k may be negative. */
  mulPow2(k) {
    if (!Number.isSafeInteger(k)) throw new TypeError(`mulPow2: k must be an integer, got ${k}`);
    return k >= 0
      ? new Fraction(this.n * 2n ** BigInt(k), this.d)
      : new Fraction(this.n, this.d * 2n ** BigInt(-k));
  }

  /** -1, 0 or 1. */
  sign() {
    return this.n < 0n ? -1 : this.n > 0n ? 1 : 0;
  }

  compare(other) {
    const o = Fraction.of(other);
    const left = this.n * o.d;
    const right = o.n * this.d;
    return left < right ? -1 : left > right ? 1 : 0;
  }

  equals(other) {
    return this.compare(other) === 0;
  }

  isInteger() {
    return this.d === 1n;
  }

  /** Integer part, rounding toward zero (a BigInt). */
  trunc() {
    return this.n / this.d;
  }

  /** Largest integer not above the value (a BigInt). */
  floor() {
    const q = this.n / this.d;
    return this.n < 0n && this.n % this.d !== 0n ? q - 1n : q;
  }

  /** Approximate value, for display and debugging only. */
  toNumber() {
    return Number(this.n) / Number(this.d);
  }

  toString() {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
}
