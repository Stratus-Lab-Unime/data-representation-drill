// Routes live in the URL hash, so the page works from any folder of any static host:
//   #/                 the list of categories
//   #/<category-id>    a new question of that category
//   #/q/<code>         the question a code stands for

export const homeHref = '#/';
export const categoryHref = (id) => `#/${id}`;
export const codeHref = (code) => `#/q/${encodeURIComponent(code)}`;

export function parseRoute(hash) {
  const path = String(hash ?? '').replace(/^#\/?/, '');
  if (path === '') return { name: 'home' };
  if (path.startsWith('q/')) {
    try {
      return { name: 'code', code: decodeURIComponent(path.slice(2)) };
    } catch {
      return { name: 'unknown' };
    }
  }
  if (/^[a-z][a-z0-9-]*$/.test(path)) return { name: 'category', id: path };
  return { name: 'unknown' };
}
