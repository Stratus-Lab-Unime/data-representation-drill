// Turns the `steps` of a question into the drawing that shows them.

import { drawComplementSteps } from './graphics/complement-steps.js';
import { drawDivisionTable } from './graphics/division-table.js';
import { drawFractionTable } from './graphics/fraction-table.js';
import { drawIeeeSteps } from './graphics/ieee-steps.js';
import { drawLongDivision } from './graphics/long-division.js';
import { drawPositionalTable } from './graphics/positional-table.js';
import { drawImageSteps, drawTextSizeSteps } from './graphics/size-steps.js';
import { TEXTS } from './texts-it.js';

const DRAWERS = {
  'division-table': drawDivisionTable,
  'long-division': drawLongDivision,
  'fraction-table': drawFractionTable,
  'ieee-steps': drawIeeeSteps,
  'complement-steps': drawComplementSteps,
  'positional-table': drawPositionalTable,
  'text-size-steps': drawTextSizeSteps,
  'image-steps': drawImageSteps,
};

/** SVG markup for one step, `{ kind, ...model }`. */
export function drawProcedure(step, texts = TEXTS) {
  const { kind, ...model } = step;
  const draw = DRAWERS[kind];
  if (!draw) throw new RangeError(`unknown kind of working: ${kind}`);
  return draw(model, { title: texts.procedureTitles[kind] });
}
