import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskService, sortByNewest } from '../src/tasks-service.mjs';

function memoryRepository(seed = []) {
  const store = new Map(seed.map((task) => [task.id, task]));
  return {
    store,
    async scan() {
      return [...store.values()];
    },
    async get(id) {
      return store.get(id) ?? null;
    },
    async put(task) {
      store.set(task.id, task);
      return task;
    },
    async remove(id) {
      store.delete(id);
    },
  };
}

function serviceWithClock(seed = []) {
  const repository = memoryRepository(seed);
  let counter = 0;
  const service = createTaskService(repository, {
    now: () => new Date(`2026-01-0${Math.min(counter + 1, 9)}T10:00:00.000Z`),
    newId: () => `id-${++counter}`,
  });
  return { service, repository };
}

test('create builds a task with server timestamps and ids', async () => {
  const { service } = serviceWithClock();
  const task = await service.create({ title: 'Escribir tests', priority: 'high' });
  assert.equal(task.id, 'id-1');
  assert.equal(task.completed, false);
  assert.equal(task.description, '');
  assert.equal(task.priority, 'high');
  assert.match(task.createdAt, /^2026-01-0\dT10:00:00/);
});

test('list returns newest tasks first', async () => {
  const tasks = [
    { id: 'a', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', createdAt: '2026-02-01T00:00:00.000Z' },
  ];
  assert.deepEqual(sortByNewest(tasks).map((task) => task.id), ['b', 'a']);
});

test('update merges the patch and preserves id and createdAt', async () => {
  const { service } = serviceWithClock();
  const created = await service.create({ title: 'Original' });
  const updated = await service.update(created.id, { title: 'Editada', completed: true });
  assert.equal(updated.title, 'Editada');
  assert.equal(updated.completed, true);
  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, created.createdAt);
});

test('update returns null for a missing task', async () => {
  const { service } = serviceWithClock();
  assert.equal(await service.update('missing', { title: 'x' }), null);
});

test('remove deletes existing tasks and reports missing ones', async () => {
  const { service, repository } = serviceWithClock();
  const created = await service.create({ title: 'Temporal' });
  assert.equal(await service.remove(created.id), true);
  assert.equal(repository.store.size, 0);
  assert.equal(await service.remove('missing'), false);
});
