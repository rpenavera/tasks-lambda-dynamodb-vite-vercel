interface StatsProps {
  total: number;
  pending: number;
  completed: number;
}

export function Stats({ total, pending, completed }: StatsProps) {
  return (
    <section className="stats" aria-label="Resumen de tareas">
      <article className="stat stat--total">
        <span className="stat__value">{total}</span>
        <span className="stat__label">Total</span>
      </article>
      <article className="stat stat--pending">
        <span className="stat__value">{pending}</span>
        <span className="stat__label">Pendientes</span>
      </article>
      <article className="stat stat--done">
        <span className="stat__value">{completed}</span>
        <span className="stat__label">Completadas</span>
      </article>
    </section>
  );
}
