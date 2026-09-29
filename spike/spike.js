import { binaryLongDivision, successiveDivisions } from '../engine/division.js';
import { fixedPointWorking } from '../engine/fixedpoint.js';
import { ieee754Working } from '../engine/ieee754.js';
import { drawDivisionTable } from '../app/graphics/division-table.js';
import { drawLongDivision } from '../app/graphics/long-division.js';
import { drawFractionTable } from '../app/graphics/fraction-table.js';
import { drawIeeeSteps } from '../app/graphics/ieee-steps.js';

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

const fixed = [
  ['Virgola fissa: 0,453125 con I=8 e D=8', fixedPointWorking('0.453125', 8, 8)],
  ['Virgola fissa: -13,625 con I=4 e D=4', fixedPointWorking('-13.625', 4, 4)],
  ['Virgola fissa: -254,3476 con I=8 e D=8', fixedPointWorking('-254.3476', 8, 8)],
];

const floats = [
  ['Virgola mobile: -612,1875', ieee754Working('-612.1875')],
  ['Virgola mobile: 1574,873', ieee754Working('1574.873')],
  ['Virgola mobile: -234987', ieee754Working('-234987')],
];

const root = document.getElementById('fid-spike');
const sections = [
  ...tables.map(([title, model]) => [title, drawDivisionTable(model, { title })]),
  ...divisions.map(([title, model]) => [title, drawLongDivision(model, { title })]),
  ...fixed.map(([title, model]) => [title, drawFractionTable(model, { title })]),
  ...floats.map(([title, model]) => [title, drawIeeeSteps(model, { title })]),
];
root.innerHTML = sections
  .map(([title, drawing]) => `<section><h2>${title}</h2>${drawing}</section>`)
  .join('');
