import { loadConfig } from './config.mjs';
import { error, json, noContent, parseJsonBody } from './http.mjs';
import { createTaskService } from './tasks-service.mjs';
import { validateCreate, validateUpdate } from './validation.mjs';

function getMethod(event) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';
}

function getPath(event) {
  return event.rawPath ?? event.path ?? '/';
}

function formatErrors(errors) {
  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('; ');
}

function taskIdFromPath(path) {
  const match = /^\/tasks\/([^/]+)$/.exec(path);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function createHandler(service) {
  return async function handle(event) {
    const method = getMethod(event);
    const path = getPath(event);

    if (method === 'OPTIONS') {
      return noContent();
    }

    try {
      if (path === '/health') {
        if (method !== 'GET') {
          return error(405, 'method not allowed');
        }
        return json(200, { status: 'ok' });
      }

      if (path === '/tasks' || path === '/tasks/') {
        if (method === 'GET') {
          const items = await service.list();
          return json(200, { items, count: items.length });
        }
        if (method === 'POST') {
          const body = parseJsonBody(event);
          if (!body.valid) {
            return error(400, body.error);
          }
          const validation = validateCreate(body.value);
          if (!validation.valid) {
            return json(400, { error: 'invalid task', details: validation.errors });
          }
          const task = await service.create(validation.value);
          return json(201, task);
        }
        return error(405, 'method not allowed');
      }

      const id = taskIdFromPath(path);
      if (!id) {
        return error(404, 'route not found');
      }

      if (method === 'GET') {
        const task = await service.get(id);
        return task ? json(200, task) : error(404, 'task not found');
      }

      if (method === 'PATCH') {
        const body = parseJsonBody(event);
        if (!body.valid) {
          return error(400, body.error);
        }
        const validation = validateUpdate(body.value);
        if (!validation.valid) {
          return json(400, { error: 'invalid task', details: validation.errors });
        }
        const task = await service.update(id, validation.value);
        return task ? json(200, task) : error(404, 'task not found');
      }

      if (method === 'DELETE') {
        const removed = await service.remove(id);
        return removed ? noContent() : error(404, 'task not found');
      }

      return error(405, 'method not allowed');
    } catch (cause) {
      console.error('unhandled error', { message: cause?.message, stack: cause?.stack });
      return error(500, 'internal server error');
    }
  };
}

let defaultHandler;

export async function handler(event) {
  if (!defaultHandler) {
    const config = loadConfig();
    const { createTaskRepository } = await import('./tasks-repository.mjs');
    const repository = createTaskRepository({ tableName: config.tableName });
    const service = createTaskService(repository);
    defaultHandler = createHandler(service);
  }
  return defaultHandler(event);
}

export { formatErrors, getMethod, getPath, taskIdFromPath };
