import assert from 'node:assert/strict';
import test from 'node:test';
import { parseModelAnswer, validateAnalysis } from './analyze.js';
const valid = { garments: [{ name: 'T-shirt', color: 'white' }], score: 75, summary: 'Simple outfit.', corrections: ['Try a contrasting accessory.'], limitations: 'Only the top is visible.' };
test('accepts a complete result and fenced JSON', () => {
  assert.deepEqual(parseModelAnswer('```json\n' + JSON.stringify(valid) + '\n```', 'stop'), valid);
});
test('rejects empty, malformed, truncated or out-of-range model results', () => {
  for (const content of ['', 'unfinished answer', JSON.stringify({ ...valid, score: 101 }), JSON.stringify({ ...valid, garments: [{ name: ' ', color: 'white' }] }), JSON.stringify({ ...valid, corrections: [] })]) assert.throws(() => parseModelAnswer(content));
  assert.throws(() => parseModelAnswer(JSON.stringify(valid), 'length'));
  assert.throws(() => validateAnalysis({ score: 70 }));
});
test('does not score photos without detected clothing', () => {
  const result = validateAnalysis({ ...valid, garments: [] });
  assert.equal(result.score, null);
  assert.deepEqual(result.corrections, []);
});
test('unscored visible clothing requires a limitation', () => {
  assert.throws(() => validateAnalysis({ ...valid, score: null, limitations: '' }));
  assert.equal(validateAnalysis({ ...valid, score: null }).score, null);
});
