import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, tasksApi } from '../services/api';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types';

export interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  pendingId: string | null;
  refresh: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<boolean>;
  updateTask: (id: string, patch: UpdateTaskInput) => Promise<boolean>;
  toggleTask: (task: Task) => Promise<boolean>;
  removeTask: (id: string) => Promise<boolean>;
  dismissError: () => void;
  dismissNotice: () => void;
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tasksApi.list();
      if (mounted.current) {
        setTasks(response.items);
      }
    } catch (cause) {
      if (mounted.current) {
        setError(errorMessage(cause));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    setError(null);
    try {
      const task = await tasksApi.create(input);
      setTasks((previous) => [task, ...previous]);
      setNotice('Tarea creada correctamente.');
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    }
  }, []);

  const updateTask = useCallback(async (id: string, patch: UpdateTaskInput) => {
    setError(null);
    setPendingId(id);
    try {
      const updated = await tasksApi.update(id, patch);
      setTasks((previous) => previous.map((task) => (task.id === id ? updated : task)));
      setNotice('Tarea actualizada.');
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setPendingId(null);
    }
  }, []);

  const toggleTask = useCallback(
    async (task: Task) => updateTask(task.id, { completed: !task.completed }),
    [updateTask],
  );

  const removeTask = useCallback(async (id: string) => {
    setError(null);
    setPendingId(id);
    try {
      await tasksApi.remove(id);
      setTasks((previous) => previous.filter((task) => task.id !== id));
      setNotice('Tarea eliminada.');
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setPendingId(null);
    }
  }, []);

  const dismissError = useCallback(() => setError(null), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    tasks,
    loading,
    error,
    notice,
    pendingId,
    refresh,
    createTask,
    updateTask,
    toggleTask,
    removeTask,
    dismissError,
    dismissNotice,
  };
}
