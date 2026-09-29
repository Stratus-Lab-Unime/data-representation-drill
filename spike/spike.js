import { binaryLongDivision, successiveDivisions } from '../engine/division.js';
import { drawDivisionTable } from '../app/graphics/division-table.js';
import { drawLongDivision } from '../app/graphics/long-division.js';

const tables = [
  ['Divisioni successive: 845 in base 2', successiveDivisions(845, 2)],
  ['Divisioni successive: 25 in base 2', successiveDivisions(25, 2)],
  ['Divisioni successive: 63 in base 16', successiveDivisions(63, 16)],
];

const divisions = [
  ['Divisione binaria: 18 diviso 2', binaryLongDivision(18, 2)],
  ['Divisione binaria: 17 diviso 3', binaryLongDivision(17, 3)],
  ['Divisione binaria: 59 diviso 5', binaryLongDivision(59, 5)],
  ['Divisione binaria: 50 diviso 6', binaryLongDivision(50, 6)],
];

const root = document.getElementById('fid-spike');
const sections = [
  ...tables.map(([title, model]) => [title, drawDivisionTable(model, { title })]),
  ...divisions.map(([title, model]) => [title, drawLongDivision(model, { title })]),
];
root.innerHTML = sections
  .map(([title, drawing]) => `<section><h2>${title}</h2>${drawing}</section>`)
  .join('');
