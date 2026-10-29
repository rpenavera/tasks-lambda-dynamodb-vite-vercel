import type { Task, UpdateTaskInput } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  pendingId: string | null;
  onToggle: (task: Task) => void;
  onUpdate: (id: string, patch: UpdateTaskInput) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

export function TaskList({ tasks, pendingId, onToggle, onUpdate, onRemove }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          pending={pendingId === task.id}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
