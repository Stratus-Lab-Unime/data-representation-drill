// The student interface: the list of categories, a question with its answer and
// working shown on request, and questions reopened from their code.

import { CodeError } from '../engine/index.js';
import { createDeck } from './deck.js';
import { h } from './dom.js';
import { drawProcedure } from './procedure.js';
import { categoryHref, codeHref, homeHref } from './route.js';
import { TEXTS } from './texts-it.js';

let counter = 0; // makes the ids of the boxes unique

/**
 * `course` is what createCourse() returns. `newSeed` and `navigate` can be replaced
 * (tests do); by default seeds are random and navigating sets the URL hash.
 */
export function createApp({ root, course, texts = TEXTS, newSeed, navigate = (hash) => { location.hash = hash; } }) {
  const { registry, renderer, categories } = course;
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const decks = new Map();
  let current = { name: 'home' };

  function deckOf(id) {
    if (!decks.has(id)) decks.set(id, createDeck(registry, id, newSeed ? { newSeed } : {}));
    return decks.get(id);
  }

  function screen(title, ...nodes) {
    document.title = title ? `${title} – ${texts.pageTitle}` : texts.pageTitle;
    root.replaceChildren(h('div', { class: 'fid-wrap' }, ...nodes));
  }

  function focusOn(element) {
    element.setAttribute('tabindex', '-1');
    element.focus();
  }

  const backLink = () => h('nav', { class: 'fid-nav' }, h('a', { href: homeHref }, `← ${texts.back}`));

  // ---- the list of categories ----

  function showHome() {
    const limitsId = `fid-limits-${++counter}`;
    const codeId = `fid-code-input-${counter}`;
    const input = h('input', { id: codeId, type: 'text', class: 'fid-input', autocomplete: 'off', spellcheck: 'false' });
    const form = h(
      'form',
      {
        class: 'fid-form',
        onSubmit: (event) => {
          event.preventDefault();
          const code = input.value.trim();
          if (code) navigate(codeHref(code));
        },
      },
      h('label', { for: codeId }, texts.openCodeLabel),
      input,
      h('button', { type: 'submit', class: 'fid-btn' }, texts.openCodeButton),
    );
    const title = h('h1', {}, texts.title);
    screen(
      '',
      title,
      texts.intro.map((paragraph) => h('p', { class: 'fid-lead' }, paragraph)),
      h(
        'section',
        { class: 'fid-warning', 'aria-labelledby': limitsId },
        h('h2', { id: limitsId }, texts.limitsTitle),
        h('ul', {}, texts.limits.map((item) => h('li', {}, item))),
      ),
      h('h2', { class: 'fid-label-title' }, texts.categoriesTitle),
      h(
        'ul',
        { class: 'fid-cats' },
        categories.map((c) => h('li', {}, h('a', { class: 'fid-cat', href: categoryHref(c.id) }, c.label))),
      ),
      h('section', { class: 'fid-open' }, h('h2', { class: 'fid-label-title' }, texts.openCodeTitle), form),
    );
    return title;
  }

  // ---- a question ----

  // A folding box, native <details>: the title stays, the content opens on click.
  // Both titles are in the summary and the style shows the one that fits the state.
  function foldingBox(id, kind, showLabel, hideLabel, ...content) {
    return h(
      'details',
      { class: `fid-item fid-${kind}`, id },
      h('summary', {}, h('span', { class: 'fid-when-closed' }, showLabel), h('span', { class: 'fid-when-open' }, hideLabel)),
      h('div', { class: 'fid-item-body' }, ...content),
    );
  }

  function showQuestion(question, { focus }) {
    const n = ++counter;
    const label = labels.get(question.generator) ?? question.generator;
    const { prompt, answer } = renderer.renderQuestion(question);

    const heading = h('h1', {}, label);
    const promptElement = h('p', { class: 'fid-prompt' }, prompt);
    const newQuestion = h(
      'button',
      {
        type: 'button',
        class: 'fid-btn fid-btn-primary',
        onClick: () => {
          if (current.name === 'category') showQuestion(deckOf(question.generator).next(), { focus: true });
          else navigate(categoryHref(question.generator));
        },
      },
      texts.newQuestion,
    );

    const boxes = [foldingBox(`fid-answer-${n}`, 'answer', texts.showAnswer, texts.hideAnswer, h('p', {}, answer))];
    if (question.steps?.length) {
      const drawings = question.steps.map((step) => {
        const drawing = h('div', { class: 'fid-drawing' });
        drawing.innerHTML = drawProcedure(step, texts); // markup built by our own escaping functions
        return drawing;
      });
      boxes.push(foldingBox(`fid-procedure-${n}`, 'procedure', texts.showProcedure, texts.hideProcedure, drawings));
    }

    screen(
      label,
      backLink(),
      heading,
      promptElement,
      h('div', { class: 'fid-actions' }, newQuestion),
      boxes,
      h('p', { class: 'fid-meta' }, `${texts.codeLabel}: `, h('code', {}, question.code), `. ${texts.codeHelp}`),
    );
    if (focus) focusOn(promptElement);
    return heading;
  }

  function showMessage(message) {
    screen('', backLink(), h('p', { class: 'fid-error', role: 'alert' }, message));
  }

  function showCode(code, options) {
    try {
      return showQuestion(registry.fromCode(code), options);
    } catch (error) {
      if (!(error instanceof CodeError)) throw error;
      return showMessage(texts.codeErrors[error.reason] ?? texts.codeErrors.format);
    }
  }

  return {
    /** Shows the screen of a route from parseRoute(); `focus` moves the focus to it. */
    show(route, { focus = false } = {}) {
      current = route;
      let landmark;
      if (route.name === 'home') landmark = showHome();
      else if (route.name === 'category' && registry.has(route.id)) landmark = showQuestion(deckOf(route.id).next(), { focus: false });
      else if (route.name === 'code') landmark = showCode(route.code, { focus: false });
      else showMessage(texts.notFound);
      if (focus && landmark) focusOn(landmark);
    },
  };
}
