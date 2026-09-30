import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { byClass, byTag, document, installDom, linkTo, visibleText } from './dom-stub.mjs';
import { createCourse } from '../course/fondamenti-di-informatica/index.js';
import { createApp } from '../app/app.js';
import { TEXTS } from '../app/texts-it.js';
import { categoryHref, codeHref, homeHref } from '../app/route.js';

installDom();
const course = createCourse();
const { registry, renderer, categories } = course;

// Categories that show a working, and the ones that do not.
const WITH_WORKING = ['dec-to-bin', 'bin-to-dec', 'dec-to-hex', 'complements', 'fixed-point', 'floating-point', 'binary-division', 'ascii-size', 'image-size'];

let root;
let navigations;
let app;

// Seeds 0, 1, 2, ...: the first question of every category is the one of seed 0.
beforeEach(() => {
  installDom();
  root = document.createElement('div');
  navigations = [];
  let seed = 0;
  app = createApp({ root, course, newSeed: () => seed++, navigate: (hash) => navigations.push(hash) });
});

const promptOf = () => byClass(root, 'fid-prompt')[0];
const summaryOf = (details) => details.children.find((c) => c.tagName === 'SUMMARY');
const answerBox = () => byClass(root, 'fid-answer')[0];
const procedureBox = () => byClass(root, 'fid-procedure')[0];
const newQuestionButton = () => byTag(root, 'button').find((b) => b.textContent === TEXTS.newQuestion);

const SECOND_PERSON = /\b(tu|te|ti|tuo|tua|tuoi|tue|voi|vi|vostro|vostra|vostri|vostre|noi|nostro|nostra)\b/i;
const IMPERATIVE = /\b(calcola|scrivi|indica|converti|rappresenta|trova|determina|ordina|completa|ricorda|considera|clicca|premi|apri)\b/i;

// ---- the home page ----

test('the home page lists the nine categories as links', () => {
  app.show({ name: 'home' });
  const h1s = byTag(root, 'h1');
  assert.equal(h1s.length, 1);
  assert.equal(h1s[0].textContent, TEXTS.title);
  const cards = byClass(root, 'fid-cat');
  assert.equal(cards.length, 9);
  cards.forEach((card, i) => {
    assert.equal(card.tagName, 'A');
    assert.equal(card.getAttribute('href'), categoryHref(categories[i].id));
    assert.equal(card.textContent, categories[i].label);
  });
  assert.equal(document.title, TEXTS.pageTitle);
});

test('the home page says what is not covered', () => {
  app.show({ name: 'home' });
  const warning = byClass(root, 'fid-warning')[0];
  assert.match(warning.textContent, /diagramma di flusso/);
  assert.match(warning.textContent, /risposta multipla/);
  assert.match(warning.textContent, /quattro o più opzioni/);
  const heading = byTag(warning, 'h2')[0];
  assert.equal(warning.getAttribute('aria-labelledby'), heading.getAttribute('id'));
});

test('the home page has a form to reopen a question from its code', () => {
  app.show({ name: 'home' });
  const [form] = byTag(root, 'form');
  const [input] = byTag(form, 'input');
  const [label] = byTag(form, 'label');
  assert.equal(label.getAttribute('for'), input.getAttribute('id'));
  input.value = '  dec-to-bin.1.000001 ';
  const event = form.dispatch('submit');
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(navigations, [codeHref('dec-to-bin.1.000001')]);
  input.value = '   ';
  form.dispatch('submit');
  assert.equal(navigations.length, 1); // an empty code goes nowhere
});

// ---- a question ----

test('a category shows its label, a question and a way back', () => {
  app.show({ name: 'category', id: 'dec-to-bin' });
  const expected = renderer.renderQuestion(registry.generate('dec-to-bin', 0));
  assert.equal(byTag(root, 'h1').length, 1);
  assert.equal(byTag(root, 'h1')[0].textContent, categories[0].label);
  assert.equal(promptOf().textContent, expected.prompt);
  assert.equal(document.title, `${categories[0].label} – ${TEXTS.pageTitle}`);
  assert.ok(linkTo(root, homeHref));
  assert.match(visibleText(root), new RegExp(registry.generate('dec-to-bin', 0).code));
});

test('the answer is hidden until asked for, and can be hidden again', () => {
  app.show({ name: 'category', id: 'dec-to-bin' });
  const answer = renderer.renderQuestion(registry.generate('dec-to-bin', 0)).answer;
  const box = answerBox();
  assert.equal(box.tagName, 'DETAILS');
  assert.equal(box.open, false);
  assert.equal(visibleText(root).includes(answer), false);
  const summary = summaryOf(box);
  assert.match(summary.textContent, new RegExp(TEXTS.showAnswer));
  assert.match(summary.textContent, new RegExp(TEXTS.hideAnswer)); // the style shows the one that fits the state
  summary.click();
  assert.equal(box.open, true);
  assert.ok(visibleText(root).includes(answer));
  summary.click();
  assert.equal(box.open, false);
  assert.equal(visibleText(root).includes(answer), false);
});

test('the working is offered only where there is one, and is a drawing', () => {
  for (const { id } of categories) {
    app.show({ name: 'category', id });
    if (WITH_WORKING.includes(id)) {
      const box = procedureBox();
      assert.ok(box, id);
      assert.equal(box.tagName, 'DETAILS');
      assert.equal(box.open, false);
      const drawings = byClass(box, 'fid-drawing');
      assert.ok(drawings.length >= 1);
      for (const drawing of drawings) {
        assert.match(drawing.innerHTML, /^<svg /);
        assert.match(drawing.innerHTML, /<title>[^<]+<\/title>/); // an accessible name
      }
      assert.equal(drawings.length, id === 'complements' ? 2 : 1); // the magnitude's divisions, then the steps
      assert.match(summaryOf(box).textContent, new RegExp(TEXTS.showProcedure));
    } else {
      assert.equal(procedureBox(), undefined, id);
    }
  }
});

test('the boxes have distinct ids and stay closed after a new question', () => {
  app.show({ name: 'category', id: 'binary-division' });
  const ids = [answerBox().getAttribute('id'), procedureBox().getAttribute('id')];
  assert.equal(new Set(ids).size, 2);
  summaryOf(answerBox()).click();
  summaryOf(procedureBox()).click();
  newQuestionButton().click();
  assert.equal(answerBox().open, false);
  assert.equal(procedureBox().open, false);
  const newIds = [answerBox().getAttribute('id'), procedureBox().getAttribute('id')];
  assert.equal(new Set([...ids, ...newIds]).size, 4);
});

test('a new question replaces the old one and takes the focus', () => {
  app.show({ name: 'category', id: 'ascii-size' });
  const first = promptOf().textContent;
  newQuestionButton().click();
  assert.notEqual(promptOf().textContent, first);
  assert.equal(promptOf().textContent, renderer.renderQuestion(registry.generate('ascii-size', 1)).prompt);
  assert.equal(document.activeElement, promptOf());
  assert.equal(promptOf().getAttribute('tabindex'), '-1');
  assert.deepEqual(navigations, []); // it stays on the same route
});

test('many new questions in a row never repeat', () => {
  app.show({ name: 'category', id: 'ascii-size' });
  const seen = new Set([promptOf().textContent]);
  for (let i = 0; i < 60; i++) {
    newQuestionButton().click();
    assert.equal(seen.has(promptOf().textContent), false);
    seen.add(promptOf().textContent);
  }
});

test('every category can be shown and renewed', () => {
  for (const { id } of categories) {
    app.show({ name: 'category', id });
    for (let i = 0; i < 3; i++) newQuestionButton().click();
    assert.ok(promptOf().textContent.length > 10, id);
  }
});

test('the focus moves to the heading on request only', () => {
  app.show({ name: 'category', id: 'complements' });
  assert.equal(document.activeElement, null);
  app.show({ name: 'category', id: 'complements' }, { focus: true });
  assert.equal(document.activeElement, byTag(root, 'h1')[0]);
  app.show({ name: 'home' }, { focus: true });
  assert.equal(document.activeElement, byTag(root, 'h1')[0]);
});

// ---- questions reopened from a code ----

test('a code reopens exactly the same question', () => {
  const question = registry.generate('fixed-point', 4242);
  app.show({ name: 'code', code: question.code });
  assert.equal(promptOf().textContent, renderer.renderQuestion(question).prompt);
  assert.equal(byTag(root, 'code')[0].textContent, question.code);
  assert.equal(byTag(root, 'h1')[0].textContent, categories.find((c) => c.id === 'fixed-point').label);
});

test('"new question" from a reopened question goes to the category route', () => {
  app.show({ name: 'code', code: registry.generate('dec-to-hex', 7).code });
  newQuestionButton().click();
  assert.deepEqual(navigations, [categoryHref('dec-to-hex')]);
});

test('a code that cannot be used says why', () => {
  const cases = [
    ['nonsense', TEXTS.codeErrors.format],
    ['dec-to-bin.1.ABC', TEXTS.codeErrors.seed],
    ['nothing-here.1.000000', TEXTS.codeErrors['unknown-generator']],
    ['dec-to-bin.99.000000', TEXTS.codeErrors.revision],
  ];
  for (const [code, message] of cases) {
    app.show({ name: 'code', code });
    const [error] = byClass(root, 'fid-error');
    assert.equal(error.textContent, message, code);
    assert.equal(error.getAttribute('role'), 'alert');
    assert.ok(linkTo(root, homeHref));
  }
});

test('unknown pages and categories say so', () => {
  for (const route of [{ name: 'unknown' }, { name: 'category', id: 'nope' }]) {
    app.show(route);
    assert.equal(byClass(root, 'fid-error')[0].textContent, TEXTS.notFound);
  }
});

// ---- the words on the screen ----

test('all the texts of the interface are impersonal', () => {
  const strings = [];
  const collect = (value) => {
    if (typeof value === 'string') strings.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(TEXTS);
  assert.ok(strings.length >= 25);
  for (const text of strings) {
    assert.doesNotMatch(text, SECOND_PERSON, text);
    assert.doesNotMatch(text, IMPERATIVE, text);
  }
});

test('everything shown on every screen is impersonal and free of leftovers', () => {
  const screens = [{ name: 'home' }, { name: 'unknown' }, ...categories.map((c) => ({ name: 'category', id: c.id }))];
  for (const route of screens) {
    app.show(route);
    for (const details of byTag(root, 'details')) details.open = true; // include the hidden content
    const text = visibleText(root);
    assert.doesNotMatch(text, SECOND_PERSON, JSON.stringify(route));
    assert.doesNotMatch(text.replace(/<svg[\s\S]*?<\/svg>/g, ''), /undefined|NaN|\[object|null/, JSON.stringify(route));
  }
});
