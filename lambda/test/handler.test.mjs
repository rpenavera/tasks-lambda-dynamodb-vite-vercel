import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/handler.mjs';
import { createTaskService } from '../src/tasks-service.mjs';

function setup() {
  const store = new Map();
  const repository = {
    async scan() {
      return [...store.values()];
    },
    async get(id) {
      return store.get(id) ?? null;
    },
    async put(task) {
      store.set(task.id, task);
    },
    async remove(id) {
      store.delete(id);
    },
  };
  let counter = 0;
  const service = createTaskService(repository, {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    newId: () => `task-${++counter}`,
  });
  return { handle: createHandler(service), store };
}

function event(method, path, body, headers = {}) {
  return {
    rawPath: path,
    requestContext: { http: { method } },
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  };
}

async function parse(response) {
  return response.body ? JSON.parse(response.body) : undefined;
}

test('GET /health returns ok', async () => {
  const { handle } = setup();
  const response = await handle(event('GET', '/health'));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(await parse(response), { status: 'ok' });
});

test('POST /tasks creates a task and GET lists it', async () => {
  const { handle } = setup();
  const created = await handle(event('POST', '/tasks', { title: 'Primera' }));
  assert.equal(created.statusCode, 201);
  const task = await parse(created);
  assert.equal(task.title, 'Primera');

  const list = await handle(event('GET', '/tasks'));
  assert.equal(list.statusCode, 200);
  const payload = await parse(list);
  assert.equal(payload.count, 1);
  assert.equal(payload.items[0].id, task.id);
});

test('PATCH /tasks/:id updates fields and DELETE removes them', async () => {
  const { handle } = setup();
  const created = await parse(await handle(event('POST', '/tasks', { title: 'Uno' })));

  const patched = await handle(event('PATCH', `/tasks/${created.id}`, { completed: true }));
  assert.equal(patched.statusCode, 200);
  assert.equal((await parse(patched)).completed, true);

  const removed = await handle(event('DELETE', `/tasks/${created.id}`));
  assert.equal(removed.statusCode, 204);
  assert.equal(removed.body, '');

  const missing = await handle(event('GET', `/tasks/${created.id}`));
  assert.equal(missing.statusCode, 404);
});

test('POST /tasks returns 400 with details for invalid input', async () => {
  const { handle } = setup();
  const response = await handle(event('POST', '/tasks', { title: '' }));
  assert.equal(response.statusCode, 400);
  const payload = await parse(response);
  assert.equal(payload.error, 'invalid task');
  assert.ok(payload.details.title);
});

test('malformed JSON and unknown routes are handled', async () => {
  const { handle } = setup();
  const bad = await handle({ ...event('POST', '/tasks'), body: '{oops' });
  assert.equal(bad.statusCode, 400);

  const notFound = await handle(event('GET', '/nope'));
  assert.equal(notFound.statusCode, 404);

  const method = await handle(event('PUT', '/tasks'));
  assert.equal(method.statusCode, 405);
});

test('OPTIONS returns 204 for preflight', async () => {
  const { handle } = setup();
  const response = await handle(event('OPTIONS', '/tasks', undefined, { origin: 'http://localhost:5173' }));
  assert.equal(response.statusCode, 204);
  assert.equal(response.body, '');
});
