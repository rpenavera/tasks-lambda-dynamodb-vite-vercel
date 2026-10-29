import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreate, validateUpdate } from '../src/validation.mjs';

test('validateCreate accepts a minimal task and applies defaults', () => {
  const result = validateCreate({ title: '  Comprar pan  ' });
  assert.equal(result.valid, true);
  assert.equal(result.value.title, 'Comprar pan');
  assert.equal(result.value.description, '');
  assert.equal(result.value.priority, 'medium');
  assert.equal(result.value.dueDate, null);
});

test('validateCreate rejects missing or blank titles', () => {
  assert.equal(validateCreate({}).valid, false);
  assert.equal(validateCreate({ title: '   ' }).valid, false);
});

test('validateCreate rejects an invalid priority and date', () => {
  const result = validateCreate({ title: 'Demo', priority: 'urgent', dueDate: '2026/01/01' });
  assert.equal(result.valid, false);
  assert.match(result.errors.priority, /priority/);
  assert.match(result.errors.dueDate, /YYYY-MM-DD/);
});

test('validateCreate rejects a non-object body', () => {
  const result = validateCreate('nope');
  assert.equal(result.valid, false);
  assert.match(result.errors.body, /JSON object/);
});

test('validateUpdate requires at least one known field', () => {
  assert.equal(validateUpdate({}).valid, false);
  assert.equal(validateUpdate({ unknown: 1 }).valid, false);
});

test('validateUpdate accepts partial booleans and strings', () => {
  const result = validateUpdate({ completed: true, title: ' Hecha ' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.value, { completed: true, title: 'Hecha' });
});

test('validateUpdate rejects a non-boolean completed flag', () => {
  const result = validateUpdate({ completed: 'yes' });
  assert.equal(result.valid, false);
  assert.match(result.errors.completed, /boolean/);
});
