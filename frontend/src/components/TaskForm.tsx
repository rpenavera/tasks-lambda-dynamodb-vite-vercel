import { useState, type FormEvent } from 'react';
import type { CreateTaskInput, Priority } from '../types';

interface TaskFormProps {
  onCreate: (input: CreateTaskInput) => Promise<boolean>;
}

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length === 0) {
      setValidation('El título es obligatorio.');
      return;
    }
    setValidation(null);
    setSubmitting(true);
    const created = await onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
    });
    setSubmitting(false);
    if (created) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setExpanded(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} aria-label="Crear tarea">
      <div className="task-form__main">
        <label className="field field--grow">
          <span className="sr-only">Título de la tarea</span>
          <input
            type="text"
            name="title"
            placeholder="¿Qué necesitas hacer?"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={validation ? 'true' : undefined}
            aria-describedby={validation ? 'task-form-error' : undefined}
          />
        </label>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Añadiendo…' : 'Añadir tarea'}
        </button>
        <button
          type="button"
          className="button button--ghost"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Menos opciones' : 'Más opciones'}
        </button>
      </div>

      {expanded ? (
        <div className="task-form__extra">
          <label className="field">
            <span>Descripción</span>
            <textarea
              name="description"
              rows={2}
              maxLength={1000}
              placeholder="Detalles opcionales"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Prioridad</span>
            <select
              name="priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label className="field">
            <span>Fecha límite</span>
            <input
              type="date"
              name="dueDate"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {validation ? (
        <p className="form-error" id="task-form-error" role="alert">
          {validation}
        </p>
      ) : null}
    </form>
  );
}
