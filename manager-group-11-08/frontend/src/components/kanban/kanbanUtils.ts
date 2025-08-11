// frontend/src/components/kanban/kanbanUtils.ts
import { KanbanTask, FiltersObject, BoardMode, ViewMode, ProcessedKanbanColumns, TasksMap, ProcessedColumnOrder } from './kanbanTypes';
import { TaskStatus, TaskPriority } from '@/common/types';

// Mapeamento de status da API para IDs de coluna no modo status
export const statusToColumnIdMap: Record<TaskStatus, string> = {
  pendente: 'backlog',
  a_fazer: 'todo',
  em_andamento: 'inProgress',
  em_revisao: 'review',
  aguardando_cliente: 'waitingClient',
  concluido: 'done',
  cancelado: 'cancelled',
};

// Ordem e títulos das colunas para o modo de status
export const statusViewColumnsConfig: Record<string, { title: string }> = {
  backlog: { title: 'Pendente' },
  todo: { title: 'A Fazer' },
  inProgress: { title: 'Em Andamento' },
  review: { title: 'Em Revisão' },
  waitingClient: { title: 'Aguardando Cliente' },
  done: { title: 'Concluído' },
  cancelled: { title: 'Cancelado' },
};
export const statusViewColumnOrder: ProcessedColumnOrder = ['backlog', 'todo', 'inProgress', 'review', 'waitingClient', 'done', 'cancelled'];

// Ordem e títulos das colunas para o modo de data
export const dateViewColumnsConfig: Record<string, { title: string }> = {
  overdue: { title: 'Atrasadas' },
  today: { title: 'Hoje' },
  tomorrow: { title: 'Amanhã' },
  future: { title: 'Futuras' },
  // Poderia ter uma coluna para tarefas sem data de vencimento também, se necessário
  // noDueDate: { title: 'Sem Data' },
};
export const dateViewColumnOrder: ProcessedColumnOrder = ['overdue', 'today', 'tomorrow', 'future'];


export const applyTaskFilters = (
  tasks: KanbanTask[],
  filters: FiltersObject,
  boardMode: BoardMode
): KanbanTask[] => {
  let filteredTasks = [...tasks]; // Começa com uma cópia para não modificar o array original

  // Filtrar por prioridade
  if (filters.priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
  }

  // Filtrar por ID do projeto (apenas no modo 'tasks-view' se um filtro de projeto estiver ativo)
  // filters.projectId é number | null, task.project_id é number | undefined
  if (boardMode === 'tasks-view' && filters.projectId !== null && filters.projectId !== undefined) {
    filteredTasks = filteredTasks.filter(task => task.project_id === filters.projectId);
  }

  // Filtrar por ID do usuário
  if (filters.userId !== null && filters.userId !== undefined) {
    const userIdToFilter = filters.userId;
    filteredTasks = filteredTasks.filter(task =>
      task.users?.some(user => (typeof user === 'number' ? user : user.id) === userIdToFilter)
    );
  }

  // Filtrar por ID da equipe (occupations)
  if (filters.teamId !== null && filters.teamId !== undefined) {
    const teamIdToFilter = filters.teamId;
    filteredTasks = filteredTasks.filter(task =>
      task.occupations?.some(occ => (typeof occ === 'number' ? occ : occ.id) === teamIdToFilter)
    );
  }

  // Filtrar por tarefas concluídas
  if (filters.showCompleted === false) { // Explicitamente verificar por false
    filteredTasks = filteredTasks.filter(task => task.status !== 'concluido');
  }
  
  // Filtrar por termo de busca (exemplo básico no título)
  if (filters.searchTerm) {
    const searchTermLower = filters.searchTerm.toLowerCase();
    filteredTasks = filteredTasks.filter(task => task.title.toLowerCase().includes(searchTermLower));
  }

  return filteredTasks;
};

const sortTasks = (tasks: KanbanTask[], viewMode: ViewMode, columnId?: string): KanbanTask[] => {
  return [...tasks].sort((a, b) => {
    // Priorizar ordenação por 'order' se disponível
    if (a.order !== undefined && b.order !== undefined) {
      if (a.order !== b.order) return (a.order || Infinity) - (b.order || Infinity);
    } else if (a.order !== undefined) {
      return -1; // a vem primeiro se tiver ordem e b não
    } else if (b.order !== undefined) {
      return 1; // b vem primeiro se tiver ordem e a não
    }

    // Ordenação secundária para modo de data
    if (viewMode === 'date') {
      const dateA = a.due_date ? new Date(a.due_date) : null;
      const dateB = b.due_date ? new Date(b.due_date) : null;

      if (dateA && dateB) {
        if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
      } else if (dateA) {
        return -1; // Tarefas com data vêm antes das sem data
      } else if (dateB) {
        return 1;
      }
    }
    // Fallback: ordenar por ID (que é number) para consistência se 'order' e datas forem iguais/ausentes
    return (a.id || 0) - (b.id || 0); // task.id é number
  });
};


export const generateKanbanColumns = (
  filteredTasks: KanbanTask[],
  viewMode: ViewMode,
  // boardMode: BoardMode, // boardMode pode não ser necessário aqui se os filtros já foram aplicados
  // projectId?: string    // projectId pode não ser necessário aqui
): { columns: ProcessedKanbanColumns, tasksMap: TasksMap, columnOrder: ProcessedColumnOrder } => {
  const tasksMap: TasksMap = {};
  filteredTasks.forEach(task => {
    tasksMap[String(task.id)] = task;
  });

  let columnOrder: ProcessedColumnOrder;
  const columns: ProcessedKanbanColumns = {};

  if (viewMode === 'status') {
    columnOrder = statusViewColumnOrder;
    columnOrder.forEach(colId => {
      columns[colId] = {
        id: colId,
        title: statusViewColumnsConfig[colId]?.title || colId,
        taskIds: [],
      };
    });

    const sortedTasks = sortTasks(filteredTasks, 'status'); // sortTasks já retorna KanbanTask[]
    sortedTasks.forEach(task => {
      const columnId = statusToColumnIdMap[task.status] || 'todo'; // Fallback para 'todo'
      if (columns[columnId]) {
        columns[columnId].taskIds.push(String(task.id)); // task.id é number, converter para string
      }
    });

  } else { // viewMode === 'date'
    columnOrder = [...dateViewColumnOrder]; // Garante que estamos usando uma cópia
    columnOrder.forEach(colId => {
      columns[colId] = {
        id: colId,
        title: dateViewColumnsConfig[colId]?.title || colId,
        taskIds: [],
      };
    });

// Normalize today and tomorrow to start of day UTC for consistent comparisons
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    filteredTasks.forEach(task => {
      let columnId = 'future'; // Default
      // task.due_date é string | undefined (formato YYYY-MM-DD)
      if (task.due_date) {
        try {
          // Parse due_date as UTC to match today/tomorrow UTC normalization
          const [year, month, day] = task.due_date.substring(0, 10).split('-').map(Number);
          const dueDateObj = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed for Date.UTC
          if (isNaN(dueDateObj.getTime())) {
            // Data inválida, pode ir para uma coluna 'sem data' ou 'futuras'
            // console.warn(`Task ${task.id} has invalid dueDate '${task.due_date}'.`);
            columnId = 'future'; // Ou uma coluna específica 'noDueDate'
          } else {
            if (dueDateObj < today) {
              columnId = 'overdue';
            } else if (dueDateObj.getTime() === today.getTime()) {
              columnId = 'today';
            } else if (dueDateObj.getTime() === tomorrow.getTime()) {
              columnId = 'tomorrow';
            } else { // dueDateObj > tomorrow
              columnId = 'future';
            }
          }
        } catch (e) {
          // console.warn(`Error parsing dueDate for task ${task.id}: '${task.due_date}'.`, e);
          columnId = 'future'; // Ou 'noDueDate'
        }
      } else {
        // Tarefas sem due_date podem ir para uma coluna específica ou 'future'
        columnId = 'future'; // Ou 'noDueDate'
      }

      if (columns[columnId]) {
        columns[columnId].taskIds.push(String(task.id)); // task.id é number
      }
    });
    
    // Ordenar tarefas dentro de cada coluna de data
    columnOrder.forEach(colId => {
      if (columns[colId]) {
        const tasksInColumn = columns[colId].taskIds.map(tid => tasksMap[tid]).filter(Boolean) as KanbanTask[];
        columns[colId].taskIds = sortTasks(tasksInColumn, 'date', colId).map(t => String(t.id));
      }
    });
  }

  return { columns, tasksMap, columnOrder };
};

/**
 * Calcula o valor decimal 'order' para uma tarefa com base em sua nova posição na coluna.
 * A lógica garante que o valor seja único e decimal, permitindo inserções entre tarefas.
 */
export const calculateNewOrderForColumn = (
  tasksInColumn: KanbanTask[],
  overId: string | null,
  activeId: string
): number => {
  // Se não houver tarefas na coluna, o primeiro item tem ordem 0.5
  if (tasksInColumn.length === 0) {
    return 0.5;
  }

  // Encontrar os índices das tarefas envolvidas
  const activeIndex = tasksInColumn.findIndex(task => String(task.id) === activeId);
  const overIndex = overId ? tasksInColumn.findIndex(task => String(task.id) === overId) : -1;

  // Se a tarefa estiver sendo movida para o final da lista
  if (overIndex === -1 || overIndex === tasksInColumn.length - 1) {
    const lastTask = tasksInColumn[tasksInColumn.length - 1];
    return (lastTask.order || 0) + 0.5;
  }

  // Se a tarefa estiver sendo movida para o início da lista
  if (overIndex === 0) {
    const firstTask = tasksInColumn[0];
    return (firstTask.order || 0) / 2;
  }

  // Se a tarefa estiver sendo movida entre duas tarefas
  const overTask = tasksInColumn[overIndex];
  const prevTask = tasksInColumn[overIndex - 1];

  // Calcular a média entre as ordens das tarefas adjacentes
  const prevOrder = prevTask.order || 0;
  const overOrder = overTask.order || 0;

  return (prevOrder + overOrder) / 2;
};
