// frontend/src/components/kanban/kanbanTypes.ts
import { Task as ApiTask, TaskPriority, TaskStatus } from '@/common/types';

// Re-exporta ApiTask como KanbanTask ou define um tipo específico se necessário.
// Por enquanto, KanbanTask será um alias para ApiTask.
export type KanbanTask = ApiTask;

export type ViewMode = 'status' | 'date';
export type BoardMode = 'project-view' | 'tasks-view';

export interface FiltersObject {
  priority?: TaskPriority | null; // string 'all'/'todos' deve ser convertida para null pelo chamador
  projectId?: number | null;
  userId?: number | null;
  teamId?: number | null;
  showCompleted?: boolean;
  searchTerm?: string;
  // Outros filtros podem ser adicionados aqui
}

export interface ProcessedKanbanColumn {
  id: string;
  title: string;
  taskIds: string[]; // Array de IDs de tarefas
}

export type ProcessedKanbanColumns = Record<string, ProcessedKanbanColumn>;

export type TasksMap = Record<string, KanbanTask>; // Mapeia ID da tarefa para o objeto KanbanTask

export type ProcessedColumnOrder = string[]; // Array de IDs de coluna na ordem correta

export interface UseProcessedKanbanDataProps {
  rawTasks: KanbanTask[];
  viewMode: ViewMode;
  boardMode: BoardMode;
  filters: FiltersObject;
  projectId?: string; // ID do projeto para contexto (ex: quando boardMode é 'project-view')
}

export interface UseProcessedKanbanDataReturn {
  columns: ProcessedKanbanColumns;
  tasksMap: TasksMap;
  columnOrder: ProcessedColumnOrder;
  isLoading: boolean; // Estado de carregamento do processamento
  error: string | null;   // Estado de erro do processamento
}
