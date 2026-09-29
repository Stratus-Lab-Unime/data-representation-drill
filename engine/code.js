// Question codes: "<generator-id>.<revision>.<seed>", for example "bin-to-dec.1.7K2M9Q".
//
// A student can report a code and the teacher can regenerate exactly the same
// question. The seed has 30 bits and is written with 6 characters of Crockford's
// base 32 alphabet, which has no I, L, O or U to avoid look-alike characters.

export const SEED_BITS = 30;
export const MAX_SEED = 2 ** SEED_BITS - 1;

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SEED_LENGTH = 6;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CODE_PATTERN = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.(\d+)\.([0-9A-Za-z]+)$/;

/** Raised for codes that cannot be turned back into a question. */
export class CodeError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'CodeError';
    this.reason = reason; // 'format' | 'seed' | 'unknown-generator' | 'revision'
  }
}

export const isValidId = (id) => typeof id === 'string' && ID_PATTERN.test(id);

/** Fresh random seed. The source of randomness can be replaced for tests. */
export function newSeed(getRandomValues = (array) => globalThis.crypto.getRandomValues(array)) {
  const buffer = new Uint32Array(1);
  getRandomValues(buffer);
  return buffer[0] & MAX_SEED;
}

export function encodeSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new CodeError(`seed out of range: ${seed}`, 'seed');
  }
  let text = '';
  for (let i = SEED_LENGTH - 1; i >= 0; i--) text += ALPHABET[(seed >>> (5 * i)) & 31];
  return text;
}

export function decodeSeed(text) {
  const normalized = String(text).toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  if (normalized.length !== SEED_LENGTH || [...normalized].some((c) => !ALPHABET.includes(c))) {
    throw new CodeError(`malformed seed: "${text}"`, 'seed');
  }
  return [...normalized].reduce((value, c) => value * 32 + ALPHABET.indexOf(c), 0);
}

export function formatCode(id, revision, seed) {
  if (!isValidId(id)) throw new CodeError(`invalid generator id: "${id}"`, 'format');
  if (!Number.isInteger(revision) || revision < 1) {
    throw new CodeError(`invalid revision: ${revision}`, 'format');
  }
  return `${id}.${revision}.${encodeSeed(seed)}`;
}

export function parseCode(code) {
  const match = CODE_PATTERN.exec(String(code).trim());
  if (!match) throw new CodeError(`malformed code: "${code}"`, 'format');
  return { id: match[1], revision: Number(match[2]), seed: decodeSeed(match[3]) };
}
