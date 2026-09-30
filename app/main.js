import { createCourse } from '../course/fondamenti-di-informatica/index.js';
import { createApp } from './app.js';
import { parseRoute } from './route.js';

const app = createApp({ root: document.getElementById('fid-root'), course: createCourse() });

let first = true;
function render() {
  app.show(parseRoute(location.hash), { focus: !first }); // do not steal the focus on the first load
  if (!first) window.scrollTo(0, 0);
  first = false;
}

window.addEventListener('hashchange', render);
render();
