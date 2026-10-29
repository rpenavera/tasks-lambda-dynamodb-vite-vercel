export function LoadingSkeleton() {
  return (
    <div className="skeleton-list" role="status" aria-label="Cargando tareas">
      {[0, 1, 2].map((item) => (
        <div className="skeleton" key={item}>
          <span className="skeleton__circle" />
          <span className="skeleton__line" />
          <span className="skeleton__line skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}
