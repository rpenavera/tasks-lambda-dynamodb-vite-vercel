import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage, tasksApi } from '../src/services/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('tasksApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'https://api.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('lists tasks from the API', async () => {
    const payload = { items: [], count: 0 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    await expect(tasksApi.list()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/tasks',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    );
  });

  it('sends create, update and delete requests', async () => {
    const task = {
      id: '1',
      title: 'Demo',
      description: '',
      completed: false,
      priority: 'medium',
      dueDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(task, 201))
      .mockResolvedValueOnce(jsonResponse({ ...task, completed: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(tasksApi.create({ title: 'Demo' })).resolves.toMatchObject({ id: '1' });
    await expect(tasksApi.update('1', { completed: true })).resolves.toMatchObject({
      completed: true,
    });
    await expect(tasksApi.remove('1')).resolves.toBeUndefined();
  });

  it('throws ApiError with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid task' }, 400)),
    );

    await expect(tasksApi.create({ title: '' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'invalid task',
    });
  });

  it('reports network failures clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(tasksApi.list()).rejects.toBeInstanceOf(ApiError);
    await expect(tasksApi.list()).rejects.toThrow(/No se pudo conectar/);
  });

  it('requires VITE_API_URL to be configured', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('fetch', vi.fn());

    await expect(tasksApi.health()).rejects.toThrow(/VITE_API_URL/);
  });

  it('formats error messages including validation details', () => {
    const error = new ApiError('invalid task', 400, { title: 'title is required' });
    expect(errorMessage(error)).toBe('invalid task: title is required');
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('strange')).toBe('Ha ocurrido un error inesperado.');
  });
});
