interface ToolbarProps {
  filter: 'all' | 'pending' | 'completed';
  search: string;
  sort: 'newest' | 'oldest' | 'priority';
  onFilterChange: (filter: 'all' | 'pending' | 'completed') => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: 'newest' | 'oldest' | 'priority') => void;
}

const FILTERS: Array<{ value: ToolbarProps['filter']; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'completed', label: 'Completadas' },
];

export function Toolbar({
  filter,
  search,
  sort,
  onFilterChange,
  onSearchChange,
  onSortChange,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="filters" role="group" aria-label="Filtrar tareas">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip ${filter === option.value ? 'chip--active' : ''}`}
            aria-pressed={filter === option.value}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="toolbar__controls">
        <label className="field field--search">
          <span className="sr-only">Buscar tareas</span>
          <input
            type="search"
            placeholder="Buscar por título o descripción…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <label className="field field--sort">
          <span className="sr-only">Ordenar tareas</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as ToolbarProps['sort'])}>
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="priority">Por prioridad</option>
          </select>
        </label>
      </div>
    </div>
  );
}
