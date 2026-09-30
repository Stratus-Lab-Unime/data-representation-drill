# data-representation-drill

A static web page that generates practice questions on the digital representation
of information: number bases, signed integers, fixed and floating point, binary
division, ASCII and image sizes. Every question is generated when it is asked, with
its correct answer and, where it exists, the working that leads to it; the student
reveals them on request.

It was written for the first in-course test of *Fondamenti di Informatica* (first
year of the degrees in Electronic and Computer Engineering and in Biomedical
Engineering, University of Messina, STRATUS Lab). The code is split so that other
teachers can reuse it: the **engine** knows nothing about any course, a **course
pack** holds the generators and the texts of one course, and the **interface** is a
thin student-facing page.

There is no backend, no build step, no dependency and no question bank. The
interface for students is in Italian; this document is about the engine.

## Contents

- [How it works](#how-it-works)
- [Repository layout](#repository-layout)
- [Running it and testing it](#running-it-and-testing-it)
- [The engine](#the-engine)
- [Writing a generator](#writing-a-generator)
- [Texts and languages](#texts-and-languages)
- [Workings](#workings)
- [Making a course pack of your own](#making-a-course-pack-of-your-own)
- [The interface](#the-interface)
- [Putting the page on a site](#putting-the-page-on-a-site)
- [The Fondamenti di Informatica pack](#the-fondamenti-di-informatica-pack)
- [Rules of the repository](#rules-of-the-repository)
- [License](#license)

## How it works

A **generator** is a pure function of a seeded random number generator. It returns
the *data* of a question, never finished sentences: a prompt and an answer, each a
message `{ id, values }`, and optionally the `steps` of a working.

```
seed ──► generator(rng) ──► { prompt: {id, values}, answer: {id, values}, steps? }
                                        │
                      locale: message id ──► text with {placeholders}
```

A **locale** turns messages into text. A **question code** such as
`dec-to-bin.1.000C1S` (generator id, revision, seed) identifies a question exactly:
the same code always regenerates the same question, which lets a teacher reopen a
question a student reports.

## Repository layout

| Path | What it is |
|---|---|
| `engine/` | The generic part: random numbers, question codes, the registry, the text renderer, exact arithmetic and the mathematics of bases, complements, fixed point, IEEE 754 and division. No course in it. |
| `course/fondamenti-di-informatica/` | A course pack: its generators, its Italian texts and its conventions. |
| `app/` | The student interface (Italian), its styles and the SVG drawings of the workings. |
| `index.html` | The page. No front matter, relative paths only. |
| `tests/` | The tests, run with Node's built-in runner. |
| `tools/check-release.mjs` | Checks that the page can be copied into another site, and that no question bank is in the repository. |
| `spike/` | A development page that shows some of the drawings. Not part of a release. |

The page itself is `index.html` together with `app/`, `engine/` and `course/`. The
other folders are for development.

## Running it and testing it

The page uses native ES modules, so it needs to be served over HTTP; opening
`index.html` from the file system does not work. Any static server will do:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Browsers may keep old copies of the files while
you work; reload without the cache (Ctrl+Shift+R) or serve with
`Cache-Control: no-store`.

Testing needs only Node.js 22 or later, with no `npm install`:

```bash
node --test "tests/*.test.mjs"
```

```bash
node tools/check-release.mjs
```

## The engine

Everything is exported from `engine/index.js`.

**Random numbers** (`rng.js`). `createRng(seed)` takes an unsigned 32-bit integer and
returns `{ seed, uint32, float, int(min, max), pick(items), chance(p) }`. The
algorithm is pinned by tests: a question code must mean the same thing in every
release. `drawUntil(rng, produce, accept, maxTries)` draws until a value is accepted,
to discard degenerate cases; it throws instead of looping forever.

**Question codes** (`code.js`). `id.revision.seed`, where the seed is 30 bits written
with six characters of Crockford's base 32 (no I, L, O or U). `newSeed()` gives a
random one; `parseCode` and `formatCode` convert.

**Questions** (`question.js`). `makeQuestion(generator, seed)` runs a generator and
returns a validated, deeply frozen question:
`{ code, generator, revision, seed, prompt, answer, steps? }`. Message values must be
plain data (strings, finite numbers, booleans, `null`, arrays, plain objects), so a
question can be serialised and compared. **Convert big integers to strings.**

**Registry** (`registry.js`). `createRegistry()` gives `register(generator)`, `has(id)`,
`list()`, `generate(id, seed?)` and `fromCode(code)`. A code made with another
revision of a generator is refused, not silently reinterpreted.

**Renderer** (`render.js`). `createRenderer({ locale, messages, formatters })` gives
`render(message)` and `renderQuestion(question)`. Templates use `{name}` and
`{name:format}`; `{{` and `}}` are literal braces. The built-in format `int` groups
digits as the locale does; add your own in `formatters`. A missing message, value or
format throws, so untranslated texts are found by the tests.

**Exact arithmetic.** `Fraction` (`fraction.js`) is an immutable rational on `BigInt`
that parses decimal text such as `"-20,67"` without ever touching floating point,
and `toDecimal()` writes one back. `radix.js` converts between bases 2 to 36
(`toBase`, `fromBase`, `toBinary`, `fromBinary`, `popcount`, `bitLength`).

**Mathematics of the representations.**

| Module | What it does |
|---|---|
| `complements.js` | `signMagnitude`, `onesComplement`, `twosComplement`, `decodeSigned`, and `complementWorking` for the steps. |
| `fixedpoint.js` | `toFixedPoint` (sign, I integer bits, D fractional bits, truncated), `fromFixedPoint` and `fixedPointWorking`. |
| `ieee754.js` | `toIeee754Single`, `fromIeee754Single` and `ieee754Working`, with the rounding of the course (see below). |
| `division.js` | `successiveDivisions` (the staircase table), `binaryLongDivision`, and the counting of digits and of 1s in those schemes. |

## Writing a generator

A generator is an object `{ id, revision, generate(rng) }`:

- `id` is kebab-case and is part of the question code;
- `revision` is an integer starting at 1. **Bump it whenever the generator would
  produce a different question for the same seed**, so old codes are not silently
  reinterpreted;
- `generate` is a pure function of `rng`. It must not use `Math.random`, the clock
  or any other source of randomness.

```js
export const addTwoNumbers = {
  id: 'add-two-numbers',
  revision: 1,
  generate(rng) {
    const a = rng.int(10, 99);
    const b = rng.int(10, 99);
    return {
      prompt: { id: 'add-two-numbers.prompt', values: { a, b } },
      answer: { id: 'add-two-numbers.answer', values: { sum: a + b } },
    };
  },
};
```

Register it, give it texts and ask for a question:

```js
import { createRegistry, createRenderer } from './engine/index.js';

const registry = createRegistry();
registry.register(addTwoNumbers);

const renderer = createRenderer({
  locale: 'en',
  messages: {
    'add-two-numbers.prompt': 'What is {a} + {b}?',
    'add-two-numbers.answer': '{sum}',
  },
});

const question = registry.generate('add-two-numbers', 12345);
renderer.renderQuestion(question);   // { prompt: 'What is 51 + 55?', answer: '106' }
registry.fromCode(question.code);    // the very same question again
```

Good habits, all followed by the existing generators:

- **Use exact arithmetic** (`BigInt`, `Fraction`) for anything that comes from decimal
  input, and avoid `Number` for big values.
- **Discard degenerate cases** with `drawUntil`: powers of two, trivial values,
  answers that are zero.
- **Keep the answer honest.** Compute it with the engine, and in the tests recompute
  it with an independent method written in plain code (see `tests/course.test.mjs`).
- **Count the questions a generator can produce.** Small spaces repeat quickly; the
  interface avoids repeats, and the tests pin the size of the small ones.
- **Pick a message id per wording**, not per language: if a sentence changes with a
  plural, use two ids (`…answerOne` and `…answer`).

## Texts and languages

The texts of the questions live in the course pack (`messages-it.js`), keyed by
message id, with `{placeholders}` for the values. To translate a pack, write another
messages file with the same keys and pass it to `createRenderer`. The tests check
that a pack uses exactly the messages its generators produce, and that nothing is
left unreplaced.

The texts of the interface (titles, buttons, warnings) are in `app/texts-it.js`.

The few words written *inside* the drawings of the workings ("Quoziente", "Resto",
"Segno", …) are Italian defaults at the top of each drawing file in `app/graphics/`.
Every drawing accepts a `labels` option to replace them, but `app/procedure.js` does
not pass one yet: to translate the interface as well, edit those defaults or extend
`procedure.js` to pass a set of labels.

## Workings

A generator can attach `steps`, a list of plain-data models that the interface draws
when the student asks for the working:

```js
steps: [{ kind: 'division-table', ...successiveDivisions(n, 2) }]
```

`app/procedure.js` maps each `kind` to a drawing function
`(model, { title, labels }) => svgMarkup`. The drawings are pure functions that build
SVG strings, so they are tested without a browser (see `tests/svg-helpers.mjs`).
Colours and fonts come from CSS classes, never from inline styles, so themes and
content security policies keep working. The shared helpers are in
`app/graphics/svg.js` (text, lines, arrows, sub- and superscripts) and
`app/graphics/step-list.js` (a label on the left, a calculation on the right).

To add a working: write the model as a function in the engine or the pack, write the
drawing in `app/graphics/`, register its `kind` in `app/procedure.js`, give its
accessible name in `app/texts-it.js`, and add tests that draw it for many inputs.

| Kind | Drawn for |
|---|---|
| `division-table` | Successive divisions, in base 2 or 16 |
| `long-division` | Binary long division |
| `fraction-table` | Successive multiplications of a fraction (fixed point) |
| `ieee-steps` | Conversion to IEEE 754 single precision |
| `complement-steps` | Sign and magnitude, one's and two's complement |
| `positional-table` | Value of a binary number from its digits |
| `text-size-steps` | Size of a text |
| `image-steps` | Size, sides, bits per pixel and colours of an image |

## Making a course pack of your own

A pack is a folder under `course/` with:

1. `generators/`, one file per generator;
2. `messages-xx.js`, exporting `messages`, `formatters` and `locale`;
3. `index.js`, exporting `GENERATORS` (the order is the order of the categories in the
   interface) and `createCourse()`, which returns `{ registry, renderer, categories }`.

Copy `course/fondamenti-di-informatica/` and change it. The interface takes a
course (`createApp({ root, course })`) and draws one button per category; only
`app/main.js` names the pack, so pointing it at another one is a one-line change.

## The interface

The student sees the list of categories, opens one to get a generated question, and
shows the answer (and the working) on request. A new question never repeats one
already dealt until the category is used up. The home page states what the page does
not cover, and each question carries its code.

Routes live in the URL hash, so the page works from any folder of any static host:
`#/` is the list, `#/<category-id>` a new question of that category and
`#/q/<code>` the question a code stands for.

The look follows the STRATUS Lab site (palette, typefaces, boxes), copied into
`app/style.css` with every rule scoped under `.fid-app`, so the page depends on
nothing from the site it is put on and does not disturb it. Answers and workings are
native `<details>` elements, which work from the keyboard and with screen readers.

## Putting the page on a site

The page is meant to be copied as it is into a folder of another site, including a
deep one, and to work there without changes:

- paths are relative, never starting with a slash;
- everything is in one folder: `index.html`, `app/`, `engine/`, `course/`;
- there are no external hosts (no CDN, no web fonts), no inline scripts or styles and
  no service worker;
- `index.html` has no Jekyll front matter, so it is copied untouched;
- no file or folder name starts with `_`, which Jekyll skips;
- web storage keys, if ever used, start with `fid-`.

`node tools/check-release.mjs` checks all of this. Run it before a release.

## The Fondamenti di Informatica pack

The categories, in the order students see them:

1. Conversion from decimal to binary
2. Conversion from binary to decimal
3. Conversion from decimal to hexadecimal
4. Encoding of integers (sign and magnitude, one's and two's complement)
5. Fixed-point real numbers
6. Floating-point real numbers (IEEE 754, single precision)
7. Binary division
8. ASCII (size of a text)
9. Images (size, sides, bits per pixel, colours)

The conventions of the course, which the generators follow:

- 1 KB is 1024 bytes; extended ASCII takes one byte per character.
- *Decimal to binary* asks how many times a digit from 2 to 9 appears in the table of
  successive divisions, counting dividends, quotients, remainders and the divisor
  written in every row. The decimal to hexadecimal remainders stay decimal in the
  working (15 is written 15) and become letters only in the result.
- *Binary division* asks for quotient, remainder and the number of 1s in the written
  scheme (dividend, divisor, quotient and every row below the dividend). It always
  counts 1s: the number of 0s depends on the convention used to write the scheme.
  Remainder rows keep their leading zeros: the remainder is written with as many
  digits as the number it comes from (at least as many as the divisor), followed by
  the bit brought down.
- *Fixed point* is a sign bit, I integer bits and D fractional bits, and the
  fractional part is truncated, not rounded.
- *Floating point* rounds the mantissa the way the course teaches it: round up when
  the first bit left out is 1, truncate when it is 0. That differs from the standard
  (ties to even) only when exactly one half is left out, and those numbers are not
  generated.
- *Signed integers* use negative numbers on 8 and 16 bits; in two's complement the
  working inverts the bits and adds 1.
- *Images* start from standard resolutions and depths and keep only sizes that are a
  whole number of KB, so the inverse questions have exact answers. 24 bits is called
  "16,7 milioni di colori".

## Rules of the repository

- **No question bank.** Questions are generated; the repository holds no list of
  them. Files from question-bank exports (for instance Moodle XML) must never be
  committed. `.gitignore` and `tools/check-release.mjs` refuse them, and sample values
  in the tests are the examples of the course slides or neutral numbers.
- **Questions are reproducible.** Never change a generator's output for a given seed
  without raising its `revision`, and never change the random number generator.
- **Tests first for mathematics.** A result is checked against an independent method,
  not only against the code that produced it.

## License

MIT, see [LICENSE](LICENSE).
