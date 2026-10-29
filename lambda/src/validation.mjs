const DEFAULT_PRIORITY = 'medium';
const PRIORITIES = ['low', 'medium', 'high'];
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateTitle(title, errors) {
  if (typeof title !== 'string' || title.trim().length === 0) {
    errors.title = 'title is required';
    return undefined;
  }
  const clean = title.trim();
  if (clean.length > TITLE_MAX) {
    errors.title = `title must be at most ${TITLE_MAX} characters`;
    return undefined;
  }
  return clean;
}

function validateDescription(description, errors) {
  if (description === undefined || description === null) {
    return '';
  }
  if (typeof description !== 'string') {
    errors.description = 'description must be a string';
    return undefined;
  }
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `description must be at most ${DESCRIPTION_MAX} characters`;
    return undefined;
  }
  return description.trim();
}

function validatePriority(priority, errors) {
  if (priority === undefined || priority === null) {
    return DEFAULT_PRIORITY;
  }
  if (typeof priority !== 'string' || !PRIORITIES.includes(priority)) {
    errors.priority = `priority must be one of: ${PRIORITIES.join(', ')}`;
    return undefined;
  }
  return priority;
}

function validateDueDate(dueDate, errors) {
  if (dueDate === undefined || dueDate === null || dueDate === '') {
    return null;
  }
  if (typeof dueDate !== 'string' || !DATE_PATTERN.test(dueDate)) {
    errors.dueDate = 'dueDate must use the YYYY-MM-DD format';
    return undefined;
  }
  const parsed = new Date(`${dueDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    errors.dueDate = 'dueDate is not a valid date';
    return undefined;
  }
  return dueDate;
}

function validateCompleted(completed, errors) {
  if (completed === undefined) {
    return undefined;
  }
  if (typeof completed !== 'boolean') {
    errors.completed = 'completed must be a boolean';
    return undefined;
  }
  return completed;
}

export function validateCreate(payload) {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: { body: 'body must be a JSON object' } };
  }

  const errors = {};
  const title = validateTitle(payload.title, errors);
  const description = validateDescription(payload.description, errors);
  const priority = validatePriority(payload.priority, errors);
  const dueDate = validateDueDate(payload.dueDate, errors);

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value: { title, description, priority, dueDate } };
}

export function validateUpdate(payload) {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: { body: 'body must be a JSON object' } };
  }

  const allowed = ['title', 'description', 'priority', 'dueDate', 'completed'];
  const unknown = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    return { valid: false, errors: { unknown: `unknown fields: ${unknown.join(', ')}` } };
  }
  if (Object.keys(payload).length === 0) {
    return { valid: false, errors: { body: 'at least one field is required' } };
  }

  const errors = {};
  const value = {};

  if (hasOwn(payload, 'title')) {
    value.title = validateTitle(payload.title, errors);
  }
  if (hasOwn(payload, 'description')) {
    value.description = validateDescription(payload.description, errors);
  }
  if (hasOwn(payload, 'priority')) {
    value.priority = validatePriority(payload.priority, errors);
  }
  if (hasOwn(payload, 'dueDate')) {
    value.dueDate = validateDueDate(payload.dueDate, errors);
  }
  if (hasOwn(payload, 'completed')) {
    value.completed = validateCompleted(payload.completed, errors);
    if (value.completed === undefined) {
      delete value.completed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value };
}

export { PRIORITIES, TITLE_MAX, DESCRIPTION_MAX };
