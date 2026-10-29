import { randomUUID } from 'node:crypto';

function sortByNewest(tasks) {
  return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createTaskService(repository, { now = () => new Date(), newId = randomUUID } = {}) {
  const timestamp = () => now().toISOString();

  return {
    async list() {
      const tasks = await repository.scan();
      return sortByNewest(tasks);
    },

    async get(id) {
      return repository.get(id);
    },

    async create(input) {
      const createdAt = timestamp();
      const task = {
        id: newId(),
        title: input.title,
        description: input.description ?? '',
        completed: false,
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate ?? null,
        createdAt,
        updatedAt: createdAt,
      };
      await repository.put(task);
      return task;
    },

    async update(id, patch) {
      const existing = await repository.get(id);
      if (!existing) {
        return null;
      }
      const updated = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: timestamp(),
      };
      await repository.put(updated);
      return updated;
    },

    async remove(id) {
      const existing = await repository.get(id);
      if (!existing) {
        return false;
      }
      await repository.remove(id);
      return true;
    },
  };
}

export { sortByNewest };
