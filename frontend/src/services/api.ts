import type {
  CreateTaskInput,
  Task,
  TaskListResponse,
  UpdateTaskInput,
} from '../types';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(message: string, status = 0, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getBaseUrl(): string {
  const value = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!value) {
    throw new ApiError('Falta configurar VITE_API_URL para conectar con la API.', 0);
  }
  return value;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (cause) {
    if (cause instanceof ApiError) {
      throw cause;
    }
    throw new ApiError('No se pudo conectar con la API. Revisa tu conexión.', 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const payload = body as { error?: string; details?: Record<string, string> } | null;
    throw new ApiError(
      payload?.error ?? `Error HTTP ${response.status}`,
      response.status,
      payload?.details,
    );
  }

  return body as T;
}

export const tasksApi = {
  list(): Promise<TaskListResponse> {
    return request<TaskListResponse>('/tasks');
  },

  create(input: CreateTaskInput): Promise<Task> {
    return request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) });
  },

  update(id: string, patch: UpdateTaskInput): Promise<Task> {
    return request<Task>(`/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  remove(id: string): Promise<void> {
    return request<void>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  health(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },
};

export function errorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.details && Object.keys(cause.details).length > 0) {
      const detail = Object.values(cause.details)[0];
      return `${cause.message}: ${detail}`;
    }
    return cause.message;
  }
  if (cause instanceof Error) {
    return cause.message;
  }
  return 'Ha ocurrido un error inesperado.';
}
