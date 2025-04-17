import React, { useState, useEffect, useCallback, useImperativeHandle } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, MoreHorizontal, Calendar, AlertCircle, Briefcase } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { taskService, Task, TaskStatus } from '@/lib/api';
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import { TaskForm } from '@/components/forms/TaskForm';

// Map para prioridades dos badges
const priorityMap = {
  alta: { label: 'Alta', variant: 'destructive' as const },
  media: { label: 'Média', variant: 'default' as const },
  baixa: { label: 'Baixa', variant: 'secondary' as const },
  urgente: { label: 'Urgente', variant: 'destructive' as const },
};

// Map para status das tarefas
const statusMap: Record<TaskStatus, string> = {
  pendente: 'todo',
  a_fazer: 'todo',
  em_andamento: 'inProgress',
  em_revisao: 'review',
  concluido: 'done'
};

// Map reverso para converter de coluna para status da API
const columnToStatusMap: Record<string, TaskStatus> = {
  todo: 'a_fazer',
  inProgress: 'em_andamento',
  review: 'em_revisao',
  done: 'concluido',
  // Colunas de data não têm mapeamento direto para status
  overdue: 'a_fazer',
  today: 'em_andamento',
  tomorrow: 'a_fazer'
};

// Interface para as colunas do Kanban
interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

// Interface para o objeto de colunas
interface KanbanColumns {
  [key: string]: Column;
}

interface KanbanBoardProps {
  projectId?: number;
  teams?: any[];
  selectedTeamId?: number | null;
  onTeamChange?: (teamId: number | null) => void;
  selectedUserId?: number | null;
  onUserChange?: (userId: number | null) => void;
  viewMode?: 'status' | 'date';
  onViewModeChange?: (mode: 'status' | 'date') => void;
}

// Componente para renderizar uma tarefa
const TaskCard = ({ task, onClick }: { task: Task, onClick: () => void }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    // Usar a abordagem de comparação por string para evitar problemas de fuso horário
    const date = new Date(dateString);
    const dateStr = date.toISOString().split('T')[0];

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return 'Hoje';
    } else if (dateStr === tomorrowStr) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  // Obter o nome do projeto
  const projectName = task.project ? task.project.title : `Projeto ${task.project_id}`;

  return (
    <div
      className="p-2 mb-2 bg-background rounded-md border shadow-sm"
      onClick={onClick}
    >
      {/* Projeto */}
      <div className="text-xs text-muted-foreground mb-1">
        <Briefcase className="h-3 w-3 inline-block mr-1" />
        {projectName}
      </div>

      {/* Nome da tarefa */}
      <h4 className="text-sm font-medium mb-2">{task.title}</h4>

      {/* Linha única com usuário, data e prioridade */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* Ícone do usuário */}
        <div className="flex -space-x-2 mr-1">
          {task.users && task.users.length > 0 ? (
            <>
              {task.users.slice(0, 1).map((user, index) => {
                const userId = typeof user === 'object' ? user.id : user;
                const userName = typeof user === 'object' ? user.name : `User ${userId}`;
                const initials = userName && userName.includes(' ') ?
                  userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
                  (userName ? userName.substring(0, 2).toUpperCase() : 'U' + userId);

                return (
                  <Avatar key={index} className="h-5 w-5 border-2 border-background">
                    <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                );
              })}

              {task.users.length > 1 && (
                <Avatar className="h-5 w-5 border-2 border-background bg-muted">
                  <AvatarFallback className="text-[8px] text-muted-foreground">
                    +{task.users.length - 1}
                  </AvatarFallback>
                </Avatar>
              )}
            </>
          ) : (
            <Avatar className="h-5 w-5 border-2 border-background">
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                ?
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Data de vencimento */}
        {task.due_date && (
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(task.due_date)}
          </div>
        )}

        {/* Prioridade */}
        <Badge variant={priorityMap[task.priority]?.variant || 'default'} className="text-[9px] px-1 py-0 h-4">
          {priorityMap[task.priority]?.label || 'Média'}
        </Badge>
      </div>
    </div>
  );
};

// Componente para renderizar uma tarefa arrastável
const SortableTaskCard = ({ id, task, onClick }: { id: string, task: Task, onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none ${isDragging ? 'ring-2 ring-primary/50' : ''}`}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
};

// Componente para área droppable
const DroppableColumn = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id
  });

  // Log quando o mouse está sobre a coluna
  React.useEffect(() => {
    if (isOver) {
      console.log('Mouse over column:', id);
    }
  }, [isOver, id]);

  return (
    <div
      ref={setNodeRef}
      className={`p-2 flex-1 overflow-y-auto min-h-[50px] transition-colors duration-200 ${isOver ? 'bg-accent/20 ring-2 ring-accent/50' : ''}`}
      data-droppable-id={id}
    >
      {children}
    </div>
  );
};

// Componente para renderizar uma coluna
const Column = ({
  column,
  tasks,
  onAddTask,
  onTaskClick,
  id
}: {
  column: Column,
  tasks: Task[],
  onAddTask: (columnId: string) => void,
  onTaskClick: (taskId: number) => void,
  id: string
}) => {
  return (
    <div
      className="kanban-column min-w-[280px] max-w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden"
      data-column-id={id}
    >
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center">
            {column.title}
            <span className="ml-2 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(id)}>
              <PlusCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DroppableColumn id={id}>
        <SortableContext
          items={tasks.map(task => String(task.id))}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <SortableTaskCard
              key={String(task.id)}
              id={String(task.id)}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>
      </DroppableColumn>
    </div>
  );
};

export const KanbanBoard = React.forwardRef<{ fetchTasks: () => Promise<void> }, KanbanBoardProps>(({
  projectId,
  teams: propTeams,
  selectedTeamId: propSelectedTeamId,
  onTeamChange,
  selectedUserId: propSelectedUserId,
  onUserChange,
  viewMode = 'status',
  onViewModeChange
}, ref) => {
  // Colunas para visualização por status
  const statusColumns: KanbanColumns = {
    todo: { id: 'todo', title: 'A Fazer', taskIds: [] },
    inProgress: { id: 'inProgress', title: 'Em Progresso', taskIds: [] },
    review: { id: 'review', title: 'Revisão', taskIds: [] },
    done: { id: 'done', title: 'Concluído', taskIds: [] },
  };

  // Colunas para visualização por data
  const dateColumns: KanbanColumns = {
    overdue: { id: 'overdue', title: 'Atrasadas', taskIds: [] },
    today: { id: 'today', title: 'Hoje', taskIds: [] },
    tomorrow: { id: 'tomorrow', title: 'Amanhã', taskIds: [] },
    future: { id: 'future', title: 'Futuras', taskIds: [] },
  };

  // Estado para as colunas atuais
  const [columns, setColumns] = useState<KanbanColumns>(viewMode === 'status' ? { ...statusColumns } : { ...dateColumns });

  // Log inicial para depuração
  console.log('Inicialização do componente com modo:', viewMode);
  console.log('Colunas iniciais:', columns);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Estados para o modal de detalhes da tarefa
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Estado para o diálogo de adicionar tarefa
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);



  // Configurar sensores para o drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distância mínima para iniciar o arrasto
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Função para carregar tarefas da API
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Carregar tarefas do projeto ou todas as tarefas
      const tasksList = projectId
        ? await taskService.getTasksByProject(projectId)
        : await taskService.getTasks();

      // Filtrar tarefas por equipe se houver uma equipe selecionada
      let filteredTasks = tasksList;

      if (propSelectedTeamId) {
        filteredTasks = filteredTasks.filter(task => {
          // Verificar se a tarefa tem ocupações (equipes) e se a equipe selecionada está entre elas
          if (!task.occupations) return false;

          // Verificar se occupations é um array de objetos ou de IDs
          return task.occupations.some(occupation => {
            if (typeof occupation === 'number') {
              return occupation === propSelectedTeamId;
            } else {
              return occupation.id === propSelectedTeamId;
            }
          });
        });
      }

      // Filtrar tarefas por usuário responsável se houver um usuário selecionado
      if (propSelectedUserId) {
        filteredTasks = filteredTasks.filter(task => {
          // Verificar se a tarefa tem usuários e se o usuário selecionado está entre eles
          if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;

          // Verificar se users é um array de objetos ou de IDs
          return task.users.some(user => {
            if (typeof user === 'number') {
              return user === propSelectedUserId;
            } else {
              return user.id === propSelectedUserId;
            }
          });
        });
      }

      // Transformar array de tarefas em objeto para facilitar acesso
      const tasksMap: Record<string, Task> = {};
      filteredTasks.forEach(task => {
        const taskId = String(task.id);
        tasksMap[taskId] = task;
      });

      setTasks(tasksMap);

      // Estrutura inicial do kanban baseada no modo de visualização atual
      console.log('Modo de visualização em fetchTasks:', viewMode);
      console.log('Estado atual das colunas:', columns);

      // Criar uma cópia das colunas atuais para preservar a estrutura
      // Usar o estado atual das colunas como base
      const initialColumns: KanbanColumns = {};

      // Garantir que estamos usando o modo de visualização correto
      if (viewMode === 'status') {
        // Colunas para modo de status
        initialColumns.todo = { id: 'todo', title: 'A Fazer', taskIds: [] };
        initialColumns.inProgress = { id: 'inProgress', title: 'Em Progresso', taskIds: [] };
        initialColumns.review = { id: 'review', title: 'Revisão', taskIds: [] };
        initialColumns.done = { id: 'done', title: 'Concluído', taskIds: [] };
      } else {
        // Colunas para modo de data
        initialColumns.overdue = { id: 'overdue', title: 'Atrasadas', taskIds: [] };
        initialColumns.today = { id: 'today', title: 'Hoje', taskIds: [] };
        initialColumns.tomorrow = { id: 'tomorrow', title: 'Amanhã', taskIds: [] };
        initialColumns.future = { id: 'future', title: 'Futuras', taskIds: [] };
      }

      console.log('Colunas iniciais em fetchTasks:', initialColumns);
      console.log('Modo atual:', viewMode, 'Colunas criadas:', Object.keys(initialColumns));

      // Distribuir tarefas nas colunas de acordo com o modo de visualização
      // Primeiro, vamos criar um mapa para armazenar as tarefas por coluna com suas datas
      const tasksByColumn: Record<string, Array<{id: string, dueDate: Date | null}>> = {};

      // Inicializar o mapa para todas as colunas
      Object.keys(initialColumns).forEach(columnId => {
        tasksByColumn[columnId] = [];
      });

      // Distribuir tarefas nas colunas
      filteredTasks.forEach(task => {
        if (viewMode === 'status') {
          // Mapear o status da API para a coluna correspondente
          const columnId = statusMap[task.status] || 'todo';
          if (initialColumns[columnId]) {
            // Para o modo de status, não precisamos ordenar por data
            initialColumns[columnId].taskIds.push(String(task.id));
          }
        } else {
          // Modo de visualização por data
          // Verificar se a tarefa tem data de vencimento
          let dueDate: Date | null = null;
          let columnId = 'today'; // Coluna padrão se não tiver data

          if (task.due_date) {
            // Usar a abordagem de comparação por string para evitar problemas de fuso horário
            const dueDate = new Date(task.due_date);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            console.log(`Tarefa ${task.id}: Data: ${dueDateStr}, Hoje: ${todayStr}, Amanhã: ${tomorrowStr}`);

            if (dueDateStr < todayStr) {
              // Tarefa atrasada
              columnId = 'overdue';
              console.log(`Tarefa ${task.id} classificada como ATRASADA`);
            } else if (dueDateStr === todayStr) {
              // Tarefa para hoje
              columnId = 'today';
              console.log(`Tarefa ${task.id} classificada como HOJE`);
            } else if (dueDateStr === tomorrowStr) {
              // Tarefa para amanhã
              columnId = 'tomorrow';
              console.log(`Tarefa ${task.id} classificada como AMANHÃ`);
            } else {
              // Tarefas futuras (após amanhã) vão para 'future'
              columnId = 'future';
              console.log(`Tarefa ${task.id} classificada como FUTURA`);
            }
          }

          console.log(`Tarefa ${task.id} (${task.title}) vai para coluna ${columnId}`);

          // Verificar se a coluna existe antes de adicionar a tarefa
          if (initialColumns[columnId]) {
            // Adicionar a tarefa ao mapa com sua data de vencimento
            tasksByColumn[columnId].push({
              id: String(task.id),
              dueDate: dueDate
            });
          } else {
            console.warn(`Coluna ${columnId} não encontrada para tarefa ${task.id}`);
            // Adicionar à coluna 'today' como fallback
            if (initialColumns['today']) {
              tasksByColumn['today'].push({
                id: String(task.id),
                dueDate: dueDate
              });
            }
          }
        }
      });

      // Se estamos no modo de data, ordenar as tarefas por data e adicionar às colunas
      if (viewMode === 'date') {
        // Ordenar tarefas atrasadas da mais antiga para a mais recente (mais urgente primeiro)
        tasksByColumn['overdue'].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Usar toISOString para garantir comparação consistente
          return a.dueDate.toISOString().localeCompare(b.dueDate.toISOString());
        });

        // Tarefas de hoje e amanhã têm a mesma data dentro de cada coluna, não precisam ser ordenadas

        // Ordenar tarefas futuras da mais recente para a mais antiga (mais próxima primeiro)
        tasksByColumn['future'].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Usar toISOString para garantir comparação consistente
          return a.dueDate.toISOString().localeCompare(b.dueDate.toISOString());
        });

        // Adicionar as tarefas ordenadas às colunas
        Object.keys(tasksByColumn).forEach(columnId => {
          initialColumns[columnId].taskIds = tasksByColumn[columnId].map(task => task.id);
        });
      }

      console.log('Colunas finais após processamento em fetchTasks:', initialColumns);
      console.log('Modo atual em fetchTasks:', viewMode);
      console.log('Colunas esperadas para o modo atual:', viewMode === 'status' ? statusColumnOrder : dateColumnOrder);

      // Verificar se as colunas correspondem ao modo atual
      const expectedColumnIds = viewMode === 'status' ? statusColumnOrder : dateColumnOrder;
      const actualColumnIds = Object.keys(initialColumns);

      const hasCorrectColumns = expectedColumnIds.every(id => actualColumnIds.includes(id));

      if (!hasCorrectColumns) {
        console.warn('As colunas não correspondem ao modo atual. Modo:', viewMode, 'Colunas:', actualColumnIds);
        // Não atualizar as colunas se elas não corresponderem ao modo atual
        return;
      }

      setColumns(initialColumns);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [projectId, propSelectedTeamId, propSelectedUserId]);

  // Expor o método fetchTasks através da referência
  useImperativeHandle(ref, () => ({
    fetchTasks
  }));

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Atualizar colunas quando o modo de visualização mudar
  useEffect(() => {
    console.log('Modo de visualização alterado para:', viewMode);

    // Definir novas colunas com base no modo de visualização
    // Importante: criar um objeto completamente novo para forçar a atualização
    const newColumns = viewMode === 'status'
      ? {
          todo: { id: 'todo', title: 'A Fazer', taskIds: [] },
          inProgress: { id: 'inProgress', title: 'Em Progresso', taskIds: [] },
          review: { id: 'review', title: 'Revisão', taskIds: [] },
          done: { id: 'done', title: 'Concluído', taskIds: [] }
        }
      : {
          overdue: { id: 'overdue', title: 'Atrasadas', taskIds: [] },
          today: { id: 'today', title: 'Hoje', taskIds: [] },
          tomorrow: { id: 'tomorrow', title: 'Amanhã', taskIds: [] },
          future: { id: 'future', title: 'Futuras', taskIds: [] }
        };

    console.log('Novas colunas definidas:', newColumns);

    // Atualizar o estado das colunas
    setColumns(newColumns);

    // Redistribuir as tarefas existentes para as novas colunas
    if (Object.keys(tasks).length > 0) {
      console.log('Redistribuindo tarefas existentes para o novo modo:', viewMode);

      // Converter o objeto de tarefas em um array
      const tasksList = Object.values(tasks);
      console.log('Total de tarefas a redistribuir:', tasksList.length);

      // Redistribuir tarefas nas colunas
      if (viewMode === 'status') {
        // Distribuir por status
        tasksList.forEach(task => {
          const columnId = statusMap[task.status] || 'todo';
          if (newColumns[columnId]) {
            newColumns[columnId].taskIds.push(String(task.id));
          }
        });
      } else {
        // Distribuir por data
        tasksList.forEach(task => {
          let columnId = 'today'; // Coluna padrão

          if (task.due_date) {
            // Usar a abordagem de comparação por string para evitar problemas de fuso horário
            const dueDate = new Date(task.due_date);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            if (dueDateStr < todayStr) {
              columnId = 'overdue';
            } else if (dueDateStr === todayStr) {
              columnId = 'today';
            } else if (dueDateStr === tomorrowStr) {
              columnId = 'tomorrow';
            } else {
              columnId = 'future';
            }
          }

          if (newColumns[columnId]) {
            newColumns[columnId].taskIds.push(String(task.id));
          }
        });
      }

      console.log('Colunas após redistribuição:', newColumns);
      setColumns(newColumns);
    } else {
      // Se não há tarefas, carregar do servidor
      setTimeout(() => {
        console.log('Recarregando tarefas após mudança de modo para:', viewMode);
        console.log('Colunas antes de fetchTasks:', newColumns);
        fetchTasks();
      }, 100);
    }
  }, [viewMode, tasks]);

  // Função chamada quando o usuário começa a arrastar um item
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
  };

  // Função para encontrar a coluna que contém um determinado ID de tarefa
  const findColumnOfTask = (taskId: string): string | null => {
    for (const [columnId, column] of Object.entries(columns)) {
      if (column.taskIds.includes(taskId)) {
        return columnId;
      }
    }
    return null;
  };

  // Função chamada quando o usuário termina de arrastar um item
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag end event:', event);

    if (!over) {
      console.log('No over target');
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    console.log('Drag end IDs:', { activeId, overId });

    if (activeId === overId) {
      console.log('Same ID, ignoring');
      return;
    }

    const sourceColumnId = findColumnOfTask(activeId);
    if (!sourceColumnId) {
      console.log('Source column not found');
      return;
    }

    // Verificar se o overId é uma coluna ou uma tarefa
    let destinationColumnId = overId;
    if (!(overId in columns)) {
      // Se não for uma coluna, encontrar a coluna que contém a tarefa
      destinationColumnId = findColumnOfTask(overId) || sourceColumnId;
      console.log('Over is not a column, found column:', destinationColumnId);
    }

    console.log('Moving from', sourceColumnId, 'to', destinationColumnId);

    // Verificar se estamos movendo entre colunas ou dentro da mesma coluna
    if (sourceColumnId !== destinationColumnId) {
      // Movendo para outra coluna
      const sourceColumn = columns[sourceColumnId];
      const destinationColumn = columns[destinationColumnId];

      // Remover da coluna de origem
      const newSourceTaskIds = sourceColumn.taskIds.filter(id => id !== activeId);

      // Adicionar à coluna de destino
      const newDestinationTaskIds = [...destinationColumn.taskIds, activeId];

      // Atualizar o estado
      const newColumns = {
        ...columns,
        [sourceColumnId]: {
          ...sourceColumn,
          taskIds: newSourceTaskIds
        },
        [destinationColumnId]: {
          ...destinationColumn,
          taskIds: newDestinationTaskIds
        }
      };

      setColumns(newColumns);

      // Atualizar a tarefa na API
      try {
        const taskId = parseInt(activeId);
        const currentTask = tasks[activeId];

        if (!currentTask) {
          toast.error('Tarefa não encontrada.');
          setColumns(columns); // Reverter mudanças
          return;
        }

        // Preparar os dados para atualização
        // Incluir campos obrigatórios para garantir que a validação passe
        const updateData: any = {
          title: currentTask.title,
          priority: currentTask.priority,
          start_date: currentTask.start_date,
          due_date: currentTask.due_date,
          project_id: currentTask.project_id
        };

        if (viewMode === 'status') {
          // No modo de status, atualizar o status da tarefa
          const newStatus = columnToStatusMap[destinationColumnId];
          updateData.status = newStatus;
        } else {
          // No modo de data, atualizar a data de vencimento da tarefa
          const today = new Date();
          // Definir a hora para meio-dia para evitar problemas de fuso horário
          today.setHours(12, 0, 0, 0);

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (destinationColumnId === 'today') {
            updateData.dueDate = today.toISOString();
            console.log('Definindo data para HOJE:', updateData.dueDate);
          } else if (destinationColumnId === 'tomorrow') {
            updateData.dueDate = tomorrow.toISOString();
            console.log('Definindo data para AMANHÃ:', updateData.dueDate);
          } else if (destinationColumnId === 'overdue') {
            // Para tarefas atrasadas, definir a data para ontem
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            updateData.dueDate = yesterday.toISOString();
            console.log('Definindo data para ONTEM:', updateData.dueDate);
          } else if (destinationColumnId === 'future') {
            // Para tarefas futuras, definir a data para 2 dias a partir de hoje
            const futureDays = new Date(today);
            futureDays.setDate(futureDays.getDate() + 2);
            updateData.dueDate = futureDays.toISOString();
            console.log('Definindo data para FUTURO:', updateData.dueDate);
          }
        }

        console.log('Atualizando tarefa ID:', taskId, 'com dados:', updateData);
        const updatedTask = await taskService.updateTask(taskId, updateData);
        console.log('Resposta da API:', updatedTask);

        // Atualizar o estado local
        const updatedTasksMap = { ...tasks };
        if (viewMode === 'status' && updateData.status) {
          updatedTasksMap[activeId] = { ...updatedTasksMap[activeId], status: updateData.status };
        } else if (updateData.dueDate) {
          // Atualizar o campo due_date no estado local (formato interno)
          updatedTasksMap[activeId] = { ...updatedTasksMap[activeId], due_date: updateData.dueDate };
        }
        setTasks(updatedTasksMap);

        toast.success(`Tarefa movida para ${destinationColumn.title}`);
      } catch (err) {
        console.error('Erro ao atualizar status da tarefa:', err);
        toast.error('Erro ao atualizar status da tarefa. Tente novamente.');

        // Reverter as mudanças no estado local em caso de erro
        setColumns(columns);
      }
    } else {
      // Movendo dentro da mesma coluna
      const sourceColumn = columns[sourceColumnId];
      const currentIndex = sourceColumn.taskIds.indexOf(activeId);
      const overTaskId = findTaskIdFromOver(over);

      if (!overTaskId || currentIndex === -1) return;

      const destinationIndex = sourceColumn.taskIds.indexOf(overTaskId);
      if (destinationIndex === -1) return;

      // Reordenar os IDs das tarefas
      const newTaskIds = arrayMove(sourceColumn.taskIds, currentIndex, destinationIndex);

      // Se estamos no modo de data e a coluna é 'overdue' ou 'future', reordenar por data
      if (viewMode === 'date' && (sourceColumnId === 'overdue' || sourceColumnId === 'future')) {
        // Obter as tarefas com suas datas
        const tasksWithDates = newTaskIds.map(taskId => {
          const task = tasks[taskId];
          let dueDate = null;
          if (task && task.due_date) {
            dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
          }
          return { id: taskId, dueDate };
        });

        // Ordenar por data
        tasksWithDates.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Usar toISOString para garantir comparação consistente
          return a.dueDate.toISOString().localeCompare(b.dueDate.toISOString());
        });

        // Atualizar os IDs das tarefas ordenadas
        const orderedTaskIds = tasksWithDates.map(task => task.id);

        // Atualizar o estado
        const newColumns = {
          ...columns,
          [sourceColumnId]: {
            ...sourceColumn,
            taskIds: orderedTaskIds
          }
        };

        setColumns(newColumns);

        // Mostrar mensagem informativa
        if (sourceColumnId === 'overdue' || sourceColumnId === 'future') {
          toast.info(`As tarefas na coluna ${sourceColumn.title} foram reordenadas por data.`);
        }
      } else {
        // Para outras colunas ou modo de status, manter a ordem definida pelo usuário
        const newColumns = {
          ...columns,
          [sourceColumnId]: {
            ...sourceColumn,
            taskIds: newTaskIds
          }
        };

        setColumns(newColumns);
      }
    }
  };

  // Função para encontrar o ID da tarefa a partir do objeto over
  const findTaskIdFromOver = (over: any): string | null => {
    // Se o over.id é uma coluna, retorna null
    if (over.id in columns) return null;

    // Caso contrário, o over.id é o ID da tarefa
    return String(over.id);
  };

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleTaskModalClose = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
  };

  const handleTaskFormSuccess = async (taskData: any) => {
    try {
      // Criar a tarefa na API
      await taskService.createTask(taskData);

      setIsDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');

      // Recarregar as tarefas
      fetchTasks();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    }
  };

  // Definir a ordem das colunas com base no modo de visualização
  const statusColumnOrder = ['todo', 'inProgress', 'review', 'done'];
  const dateColumnOrder = ['overdue', 'today', 'tomorrow', 'future'];
  const columnOrder = viewMode === 'status' ? statusColumnOrder : dateColumnOrder;

  console.log('Ordem das colunas:', columnOrder);
  console.log('Colunas atuais:', columns);
  console.log('Modo atual de visualização:', viewMode);

  // Log para depuração
  useEffect(() => {
    console.log('Estado atual das colunas:', columns);
    console.log('Modo atual:', viewMode);
  }, [columns, viewMode]);

  if (loading) {
    return (
      <div className="h-full">
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columnOrder.map(columnId => (
            <div key={columnId} className="kanban-column min-w-[280px] max-w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="p-2 flex-1 overflow-y-auto min-h-[50px]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-3 mb-2 bg-background rounded-md border shadow-sm">
                    {/* Projeto */}
                    <div className="mb-1">
                      <Skeleton className="h-3 w-24" />
                    </div>

                    {/* Nome da tarefa */}
                    <Skeleton className="h-4 w-full mb-2" />

                    {/* Linha única com usuário, data e prioridade */}
                    <div className="flex items-center gap-2">
                      {/* Ícone do usuário */}
                      <Skeleton className="h-5 w-5 rounded-full" />

                      {/* Data */}
                      <Skeleton className="h-3 w-16" />

                      {/* Prioridade */}
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Preparar as tarefas para cada coluna
  const columnTasks = columnOrder.reduce((acc: Record<string, Task[]>, columnId: string) => {
    const column = columns[columnId];
    if (!column) return acc;

    acc[columnId] = column.taskIds
      .map(taskId => tasks[taskId])
      .filter(Boolean);

    return acc;
  }, {} as Record<string, Task[]>);

  // Encontrar a tarefa ativa
  const activeTask = activeId ? tasks[activeId] : null;



  return (
    <div className="h-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}



      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={true}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columnOrder.map(columnId => {
            console.log('Renderizando coluna:', columnId);
            const column = columns[columnId];
            console.log('Coluna encontrada:', column);

            // Se a coluna não existir, criar uma coluna vazia com o ID e título corretos
            if (!column) {
              console.log('Coluna não encontrada, criando coluna vazia:', columnId);
              let title = columnId;

              // Definir títulos para colunas de data
              if (columnId === 'overdue') title = 'Atrasadas';
              else if (columnId === 'today') title = 'Hoje';
              else if (columnId === 'tomorrow') title = 'Amanhã';
              else if (columnId === 'future') title = 'Futuras';

              // Definir títulos para colunas de status
              else if (columnId === 'todo') title = 'A Fazer';
              else if (columnId === 'inProgress') title = 'Em Progresso';
              else if (columnId === 'review') title = 'Revisão';
              else if (columnId === 'done') title = 'Concluído';

              return (
                <Column
                  key={columnId}
                  id={columnId}
                  column={{ id: columnId, title, taskIds: [] }}
                  tasks={[]}
                  onAddTask={(columnId) => {
                    setSelectedColumnId(columnId);
                    setIsDialogOpen(true);
                  }}
                  onTaskClick={handleTaskClick}
                />
              );
            }

            return (
              <Column
                key={column.id}
                id={column.id}
                column={column}
                tasks={columnTasks[columnId] || []}
                onAddTask={(columnId) => {
                  setSelectedColumnId(columnId);
                  setIsDialogOpen(true);
                }}
                onTaskClick={handleTaskClick}
              />
            );
          })}

          <div className="min-w-[280px] max-w-[280px] border-2 border-dashed border-border flex items-center justify-center rounded-lg">
            <Button variant="ghost" className="flex items-center gap-2" onClick={() => fetchTasks()}>
              <PlusCircle className="h-4 w-4" />
              Atualizar Quadro
            </Button>
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px] opacity-80 shadow-lg">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de detalhes da tarefa */}
      <TaskDetailsModal
        isOpen={isTaskModalOpen}
        onClose={handleTaskModalClose}
        taskId={selectedTaskId}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Diálogo para adicionar tarefa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da tarefa. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TaskForm
              onSuccess={handleTaskFormSuccess}
              defaultProjectId={projectId}
              defaultStatus={selectedColumnId ? columnToStatusMap[selectedColumnId] : undefined}
              projectUsers={propTeams?.flatMap(team => team.users || []) || []}
              projectTeams={propTeams || []}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});