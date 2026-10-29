import { useState, type FormEvent } from 'react';
import type { Priority, Task, UpdateTaskInput } from '../types';
import { formatDate, isOverdue } from '../utils/format';
import { PriorityBadge } from './PriorityBadge';

interface TaskItemProps {
  task: Task;
  pending: boolean;
  onToggle: (task: Task) => void;
  onUpdate: (id: string, patch: UpdateTaskInput) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

export function TaskItem({ task, pending, onToggle, onUpdate, onRemove }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [validation, setValidation] = useState<string | null>(null);

  function startEditing() {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate ?? '');
    setValidation(null);
    setEditing(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length === 0) {
      setValidation('El título es obligatorio.');
      return;
    }
    setSaving(true);
    const updated = await onUpdate(task.id, {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
    });
    setSaving(false);
    if (updated) {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <li className="task task--editing">
        <form className="task-edit" onSubmit={handleSave} aria-label={`Editar ${task.title}`}>
          <label className="field">
            <span>Título</span>
            <input
              type="text"
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={validation ? 'true' : undefined}
            />
          </label>
          <label className="field">
            <span>Descripción</span>
            <textarea
              rows={2}
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="task-edit__row">
            <label className="field">
              <span>Prioridad</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </label>
            <label className="field">
              <span>Fecha límite</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>
          {validation ? (
            <p className="form-error" role="alert">
              {validation}
            </p>
          ) : null}
          <div className="task-edit__actions">
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`task ${task.completed ? 'task--done' : ''}`}>
      <button
        type="button"
        className="task__toggle"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? `Marcar ${task.title} como pendiente` : `Marcar ${task.title} como completada`}
        disabled={pending}
        onClick={() => onToggle(task)}
      >
        {task.completed ? '✓' : ''}
      </button>

      <div className="task__content">
        <h3 className="task__title">{task.title}</h3>
        {task.description ? <p className="task__description">{task.description}</p> : null}
        <div className="task__meta">
          <PriorityBadge priority={task.priority} />
          {task.dueDate ? (
            <span className={`task__due ${isOverdue(task.dueDate) && !task.completed ? 'task__due--overdue' : ''}`}>
              Vence {formatDate(task.dueDate)}
            </span>
          ) : null}
          <span className="task__date">Creada {formatDate(task.createdAt)}</span>
        </div>
      </div>

      <div className="task__actions">
        {confirming ? (
          <>
            <span className="task__confirm">¿Eliminar?</span>
            <button
              type="button"
              className="button button--small button--danger"
              disabled={pending}
              onClick={async () => {
                const removed = await onRemove(task.id);
                if (!removed) {
                  setConfirming(false);
                }
              }}
            >
              Sí
            </button>
            <button
              type="button"
              className="button button--small button--ghost"
              onClick={() => setConfirming(false)}
            >
              No
            </button>
          </>
        ) : (
          <>
            <button type="button" className="button button--small button--ghost" onClick={startEditing}>
              Editar
            </button>
            <button
              type="button"
              className="button button--small button--ghost"
              onClick={() => setConfirming(true)}
            >
              Eliminar
            </button>
          </>
        )}
      </div>
    </li>
  );
}
