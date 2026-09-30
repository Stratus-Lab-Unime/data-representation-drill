// A small element builder: h('button', { class: 'x', onClick: fn }, 'text', child).
// Text is always set as text, never as markup.

export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'class') element.className = value;
    else if (name === 'hidden') element.hidden = Boolean(value);
    else if (/^on[A-Z]/.test(name)) element.addEventListener(name.slice(2).toLowerCase(), value);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    element.append(typeof child === 'object' ? child : String(child));
  }
  return element;
}
