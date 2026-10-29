export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
}

export type UpdateTaskInput = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'completed'>
>;

export interface TaskListResponse {
  items: Task[];
  count: number;
}

export type TaskFilter = 'all' | 'pending' | 'completed';
export type TaskSort = 'newest' | 'oldest' | 'priority';

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
