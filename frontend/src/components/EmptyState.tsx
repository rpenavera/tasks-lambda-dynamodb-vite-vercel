interface EmptyStateProps {
  filtered: boolean;
  onReset?: () => void;
}

export function EmptyState({ filtered, onReset }: EmptyStateProps) {
  return (
    <div className="empty" role="status">
      <span className="empty__icon" aria-hidden="true">
        ✓
      </span>
      <h2>{filtered ? 'No hay tareas con ese filtro' : 'Tu lista está vacía'}</h2>
      <p>
        {filtered
          ? 'Prueba con otro filtro o limpia la búsqueda para ver todas tus tareas.'
          : 'Crea tu primera tarea con el formulario de arriba y empieza a organizarte.'}
      </p>
      {filtered && onReset ? (
        <button type="button" className="button button--ghost" onClick={onReset}>
          Ver todas las tareas
        </button>
      ) : null}
    </div>
  );
}
