// The question format.
//
// A generator returns structured data, never finished sentences: the prompt and
// the answer are messages { id, values } that a locale turns into text (see
// render.js). All values must be plain data (strings, finite numbers, booleans,
// null, arrays, plain objects), so a question can be serialised and compared.
// Big integers must be converted to strings by the generator.

import { createRng } from './rng.js';
import { formatCode } from './code.js';

export class QuestionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuestionError';
  }
}

function assertPlainData(value, where) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new QuestionError(`${where}: number is not finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertPlainData(item, `${where}[${i}]`));
    return;
  }
  const proto = value !== undefined && typeof value === 'object' ? Object.getPrototypeOf(value) : 0;
  if (proto === Object.prototype || proto === null) {
    for (const [key, item] of Object.entries(value)) assertPlainData(item, `${where}.${key}`);
    return;
  }
  throw new QuestionError(`${where}: not plain data (${typeof value})`);
}

function checkMessage(message, where) {
  if (!message || typeof message.id !== 'string' || message.id === '') {
    throw new QuestionError(`${where}: needs a non-empty string "id"`);
  }
  const values = message.values ?? {};
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    throw new QuestionError(`${where}.values: must be an object`);
  }
  assertPlainData(values, `${where}.values`);
  return { id: message.id, values };
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/**
 * Runs a generator with a seed and returns the validated, frozen question:
 * { code, generator, revision, seed, prompt, answer, steps? }.
 * `steps` is optional working shown on demand; it must be plain data.
 */
export function makeQuestion(generator, seed) {
  const raw = generator.generate(createRng(seed));
  const question = {
    code: formatCode(generator.id, generator.revision, seed),
    generator: generator.id,
    revision: generator.revision,
    seed,
    prompt: checkMessage(raw?.prompt, 'prompt'),
    answer: checkMessage(raw?.answer, 'answer'),
  };
  if (raw.steps !== undefined) {
    assertPlainData(raw.steps, 'steps');
    question.steps = raw.steps;
  }
  return deepFreeze(question);
}
