import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { Task } from '../src/types';

const NOW = '2026-01-01T10:00:00.000Z';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    title: 'Tarea de prueba',
    description: '',
    completed: false,
    priority: 'medium',
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFakeApi(initial: Task[]) {
  let tasks = [...initial];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const id = url.match(/\/tasks\/([^/]+)$/)?.[1];

    if (url.endsWith('/tasks') && method === 'GET') {
      return jsonResponse({ items: tasks, count: tasks.length });
    }
    if (url.endsWith('/tasks') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as Partial<Task>;
      const task = makeTask({
        title: body.title,
        description: body.description ?? '',
        priority: body.priority ?? 'medium',
        dueDate: body.dueDate ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      tasks = [task, ...tasks];
      return jsonResponse(task, 201);
    }
    if (id && method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as Partial<Task>;
      const current = tasks.find((task) => task.id === id);
      if (!current) {
        return jsonResponse({ error: 'task not found' }, 404);
      }
      const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
      tasks = tasks.map((task) => (task.id === id ? updated : task));
      return jsonResponse(updated);
    }
    if (id && method === 'DELETE') {
      tasks = tasks.filter((task) => task.id !== id);
      return new Response(null, { status: 204 });
    }
    return jsonResponse({ error: 'not found' }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('App', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'https://api.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('shows the empty state when there are no tasks', async () => {
    installFakeApi([]);
    render(<App />);

    expect(await screen.findByText('Tu lista está vacía')).toBeInTheDocument();
  });

  it('renders tasks and the summary counters', async () => {
    installFakeApi([
      makeTask({ id: 'a', title: 'Comprar pan', priority: 'high' }),
      makeTask({ id: 'b', title: 'Pagar factura', completed: true, priority: 'low' }),
    ]);
    render(<App />);

    expect(await screen.findByText('Comprar pan')).toBeInTheDocument();
    const stats = screen.getByRole('region', { name: 'Resumen de tareas' });
    expect(within(stats).getByText('2')).toBeInTheDocument();
    expect(within(stats).getAllByText('1')).toHaveLength(2);
  });

  it('creates a task from the form', async () => {
    const user = userEvent.setup();
    installFakeApi([]);
    render(<App />);
    await screen.findByText('Tu lista está vacía');

    await user.type(screen.getByPlaceholderText('¿Qué necesitas hacer?'), 'Nueva tarea');
    await user.click(screen.getByRole('button', { name: 'Añadir tarea' }));

    expect(await screen.findByText('Nueva tarea')).toBeInTheDocument();
    expect(screen.getByText('Tarea creada correctamente.')).toBeInTheDocument();
  });

  it('validates empty titles on the client', async () => {
    const user = userEvent.setup();
    installFakeApi([]);
    render(<App />);
    await screen.findByText('Tu lista está vacía');

    await user.click(screen.getByRole('button', { name: 'Añadir tarea' }));
    expect(await screen.findByText('El título es obligatorio.')).toBeInTheDocument();
  });

  it('filters tasks and clears the filter', async () => {
    const user = userEvent.setup();
    installFakeApi([
      makeTask({ id: 'a', title: 'Pendiente uno' }),
      makeTask({ id: 'b', title: 'Completada uno', completed: true }),
    ]);
    render(<App />);
    await screen.findByText('Pendiente uno');

    await user.click(screen.getByRole('button', { name: 'Completadas' }));
    expect(screen.queryByText('Pendiente uno')).not.toBeInTheDocument();
    expect(screen.getByText('Completada uno')).toBeInTheDocument();
  });

  it('toggles a task and deletes it after confirmation', async () => {
    const user = userEvent.setup();
    const fetchMock = installFakeApi([makeTask({ id: 'a', title: 'Tarea única' })]);
    render(<App />);
    await screen.findByText('Tarea única');

    await user.click(screen.getByRole('checkbox', { name: /Marcar Tarea única como completada/ }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/tasks/a',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Sí' }));
    await waitFor(() => {
      expect(screen.queryByText('Tarea única')).not.toBeInTheDocument();
    });
  });
});
