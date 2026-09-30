// A minimal stand-in for the parts of the DOM the interface uses, so its screens
// can be built and clicked in Node without any dependency.

class TextNode {
  constructor(data) {
    this.nodeType = 3;
    this.data = String(data);
  }

  get textContent() {
    return this.data;
  }
}

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = '';
    this.parent = null;
    this.open = false;
    this.hidden = false;
    this.innerHTML = '';
    this.value = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes) {
    for (const node of nodes) {
      const child = typeof node === 'string' ? new TextNode(node) : node;
      child.parent = this;
      this.children.push(child);
    }
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatch(type) {
    const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
    return event;
  }

  click() {
    const event = this.dispatch('click');
    // like a browser: clicking the summary of a <details> toggles it
    if (this.tagName === 'SUMMARY' && this.parent?.tagName === 'DETAILS') this.parent.open = !this.parent.open;
    return event;
  }

  focus() {
    document.activeElement = this;
  }

  get textContent() {
    return this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.children = [new TextNode(value)];
  }
}

export const document = {
  title: '',
  activeElement: null,
  createElement: (tag) => new Element(tag),
  createTextNode: (text) => new TextNode(text),
};

/** Makes the stub the global `document`, as the interface expects. */
export function installDom() {
  globalThis.document = document;
  document.title = '';
  document.activeElement = null;
  return document;
}

export function findAll(root, predicate) {
  const found = [];
  const visit = (node) => {
    if (node.tagName && predicate(node)) found.push(node);
    (node.children ?? []).forEach(visit);
  };
  visit(root);
  return found;
}

export const byTag = (root, tag) => findAll(root, (n) => n.tagName === tag.toUpperCase());
export const byClass = (root, name) => findAll(root, (n) => n.className.split(/\s+/).includes(name));
export const buttonNamed = (root, text) => byTag(root, 'button').find((b) => b.textContent === text);
export const linkTo = (root, href) => byTag(root, 'a').find((a) => a.getAttribute('href') === href);
export const visibleText = (root) => {
  const parts = [];
  const visit = (node) => {
    if (node.hidden) return;
    if (node.nodeType === 3) {
      parts.push(node.data);
      return;
    }
    // a closed <details> shows only its summary
    const shown = node.tagName === 'DETAILS' && !node.open ? node.children.filter((c) => c.tagName === 'SUMMARY') : node.children ?? [];
    shown.forEach(visit);
  };
  visit(root);
  return parts.join(' ');
};
