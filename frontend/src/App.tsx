import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { Stats } from './components/Stats';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { Toolbar } from './components/Toolbar';
import { useTasks } from './hooks/useTasks';
import { PRIORITY_ORDER, type TaskFilter, type TaskSort } from './types';

function matchesFilter(completed: boolean, filter: TaskFilter): boolean {
  if (filter === 'pending') {
    return !completed;
  }
  if (filter === 'completed') {
    return completed;
  }
  return true;
}

export default function App() {
  const {
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
  } = useTasks();

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TaskSort>('newest');

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(dismissNotice, 4000);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      if (!matchesFilter(task.completed, filter)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'priority') {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      const comparison = a.createdAt.localeCompare(b.createdAt);
      return sort === 'oldest' ? comparison : -comparison;
    });
  }, [tasks, filter, search, sort]);

  const isFiltered = filter !== 'all' || search.trim().length > 0;

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">Gestor de tareas</p>
          <h1>Organiza tu día, una tarea a la vez.</h1>
          <p className="hero__subtitle">
            Crea, prioriza y completa tus tareas. Todo se guarda en la nube para que puedas
            volver cuando quieras.
          </p>
        </div>
      </header>

      <main className="container">
        <Stats total={total} pending={pending} completed={completed} />

        <TaskForm onCreate={createTask} />

        <div className="live-region" aria-live="polite">
          {notice ? <p className="banner banner--success">{notice}</p> : null}
        </div>

        {error ? (
          <ErrorBanner message={error} onRetry={refresh} onDismiss={dismissError} />
        ) : null}

        <Toolbar
          filter={filter}
          search={search}
          sort={sort}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onSortChange={setSort}
        />

        {loading ? (
          <LoadingSkeleton />
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            filtered={isFiltered}
            onReset={() => {
              setFilter('all');
              setSearch('');
            }}
          />
        ) : (
          <TaskList
            tasks={visibleTasks}
            pendingId={pendingId}
            onToggle={toggleTask}
            onUpdate={updateTask}
            onRemove={removeTask}
          />
        )}
      </main>

      <footer className="footer">
        <p>Tasks · Vite + React · AWS Lambda + DynamoDB</p>
      </footer>
    </div>
  );
}
