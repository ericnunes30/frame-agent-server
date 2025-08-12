import React, { useState, useEffect, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
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
import { PlusCircle, MoreHorizontal, Calendar, AlertCircle, Briefcase, Timer, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Task, TaskStatus, UpdateTaskRequest } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import useProcessedKanbanData from '@/hooks/useProcessedKanbanData';
import {
  KanbanTask, // Alterado de Task para KanbanTask
  ViewMode,
  BoardMode,
  FiltersObject,
  ProcessedKanbanColumns, // Removido alias desnecessário
  TasksMap,
  ProcessedColumnOrder, // Removido alias desnecessário
  ProcessedKanbanColumn,
} from './kanbanTypes';
import { TaskForm } from '@/components/forms/TaskForm';
import { TaskFormRef } from '@/components/forms/TaskForm'; // Importar TaskFormRef
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { calculateNewOrderForColumn } from './kanbanUtils';

// Map para prioridades dos badges
const priorityMap = {
  alta: { label: 'Alta', variant: 'destructive' as const },
  media: { label: 'Média', variant: 'default' as const },
  baixa: { label: 'Baixa', variant: 'secondary' as const },
  urgente: { label: 'Urgente', variant: 'destructive' as const },
};

// Map para status das tarefas
const statusMap: Record<TaskStatus, string> = {
  pendente: 'backlog',
  a_fazer: 'todo',
  em_andamento: 'inProgress',
  em_revisao: 'review',
  aguardando_cliente: 'waitingClient',
  concluido: 'done',
  cancelado: 'cancelled'
};

// Map reverso para converter de coluna para status da API
const columnToStatusMap: Record<string, TaskStatus> = {
  backlog: 'pendente',
  todo: 'a_fazer',
  inProgress: 'em_andamento',
  review: 'em_revisao',
  waitingClient: 'aguardando_cliente',
  done: 'concluido',
  cancelled: 'cancelado',
  // Colunas de data não têm mapeamento direto para status
  overdue: 'a_fazer',
  today: 'em_andamento',
  tomorrow: 'a_fazer'
};

// Ordem das colunas para o modo de status
const statusColumnOrder = ['backlog', 'todo', 'inProgress', 'review', 'waitingClient', 'done', 'cancelled'];

// Ordem das colunas para o modo de data
const dateColumnOrder = ['overdue', 'today', 'tomorrow', 'future'];

// Interface local Column removida pois ProcessedKanbanColumn de kanbanTypes é usada.
// interface Column {
//   id: string;
//   title: string;
//   taskIds: string[];
// }

// Interface para o objeto de colunas
// Esta interface local KanbanColumns será removida/substituída pela do hook.
// interface KanbanColumns {
//   [key: string]: Column;
// }

interface KanbanBoardProps {
  rawTasks: KanbanTask[];
  viewMode: ViewMode;
  boardMode: BoardMode;
  filters: FiltersObject;
  projectId?: string; // projectId agora é string e opcional, conforme kanbanTypes
  project?: any; // Manter por enquanto, para compatibilidade
  // onTasksUpdated?: () => Promise<void>; // REMOVA esta linha

  // ADICIONE as seguintes props:
  onTaskStatusChange?: (task: KanbanTask, newStatus: TaskStatus, newOrder?: number) => Promise<void>;
  onGenericTaskUpdate?: () => Promise<void>;
  onUpdateTaskApi: (id: number, data: UpdateTaskRequest) => Promise<any>;
  // As props abaixo serão removidas pois seus valores virão através do objeto `filters`
  // ou são controladas pelo componente pai que fornecerá viewMode, boardMode e filters.
  // teams?: any[];
  // selectedTeamId?: number | null;
  // onTeamChange?: (teamId: number | null) => void;
  // selectedUserId?: number | null;
  // onUserChange?: (userId: number | null) => void;
  // onViewModeChange?: (mode: 'status' | 'date') => void;
  // priorityFilter?: string | null;
  // forceUserFilter?: boolean;
  // onTasksFiltered?: (tasks: KanbanTask[]) => void; // Ajustado para KanbanTask
  // mode: 'project-view' | 'tasks-view'; // boardMode substitui 'mode'
  // showCompleted?: boolean;
}

// Componente para renderizar uma tarefa
const TaskCard = ({
  task,
  onClick,
  onTaskStatusChange,
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate,
  onUpdateTaskApi, // Desestruturar a prop
  onDuplicateTask // Nova prop para duplicar
}: {
  task: KanbanTask, // Alterado para KanbanTask
  onClick: () => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void, // onTimerUpdate em TaskCard espera (seconds: number)
  onUpdateTaskApi: (id: number, data: UpdateTaskRequest) => Promise<any>, // Nova prop
  onDuplicateTask?: (task: KanbanTask) => void, // Nova prop para duplicar
}) => {
  const formatDate = (dateString?: string) => { // dateString pode ser undefined
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
  const projectName = task.project?.title || `Projeto ${task.project_id}`;

  // Função para atualizar o status da tarefa quando o temporizador é iniciado/pausado
  const handleStatusChange = async (status: string) => {
    try {
      // Mapear o status do temporizador para o status da API
      let apiStatus: TaskStatus = 'em_andamento';
      if (status === 'Pausado') {
        apiStatus = 'a_fazer';
      }

      // Atualizar o status da tarefa na API
      await onUpdateTaskApi(task.id, { status: apiStatus }); // Usar a prop onUpdateTaskApi

      // Mostrar toast de confirmação
      toast.success(`Status da tarefa atualizado para ${status}`);

      // Notificar o componente pai sobre a mudança de status para atualizar o estado local
      if (onTaskStatusChange) {
        onTaskStatusChange(task.id, apiStatus);
      }
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      toast.error('Não foi possível atualizar o status da tarefa');
    }
  };

  // Verificar se o timer está em execução para esta tarefa
  const isTimerRunning = timerRunningTaskId === String(task.id);

  // Verificar se o status da tarefa é "em_andamento"
  const isInProgress = task.status === 'em_andamento';

  // Adicionar uma classe especial para destacar visualmente tarefas em andamento com timer ativo
  const cardClasses = `p-2 mb-2 bg-background rounded-md border shadow-sm
    ${isTimerRunning ? 'border-green-400 shadow-green-100' : ''}
    ${isInProgress && !isTimerRunning ? 'border-yellow-400' : ''}`;

  return (
    <div
      className={`${cardClasses} relative group cursor-pointer`}
      onClick={onClick}
    >
      {/* Projeto */}
      <div className="text-xs text-muted-foreground mb-1">
        <Briefcase className="h-3 w-3 inline-block mr-1" />
        {projectName}
      </div>

      {/* Botão de duplicar (aparece no hover) */}
      {onDuplicateTask && (
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white shadow-sm border rounded p-1.5 z-10"
          onClick={(e) => {
            e.stopPropagation(); // Evita abrir o modal da tarefa
            onDuplicateTask(task);
          }}
          title="Duplicar tarefa"
        >
          <Copy className="h-3 w-3 text-gray-600 hover:text-gray-800" />
        </button>
      )}

      {/* Nome da tarefa */}
      <h4 className="text-sm font-medium mb-2">
        {isTimerRunning && (
          <Timer className="h-3 w-3 inline-block mr-1 text-green-500" />
        )}
        {task.title}
      </h4>

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

        {/* Linha inferior com prioridade e temporizador */}
        <div className="flex items-center justify-between pt-1">
          {/* Prioridade */}
          <Badge variant={priorityMap[task.priority]?.variant || 'default'} className="text-[9px] px-1 py-0 h-4 mr-3">
            {priorityMap[task.priority]?.label || 'Média'}
          </Badge>

          {/* Temporizador */}
          <div className="flex-shrink-0">
            <TaskTimer
              taskId={String(task.id)}
              initialTime={task.timer || 0}
              isRunning={isTimerRunning}
              compact={true}
              disabled={true} // TEMPORIZADOR DESABILITADO - não é prioridade corrigir bugs
              onStatusChange={(status) => {
                // Atualizar o estado do timer em execução
                if (status === "Em Andamento") {
                  setTimerRunningTaskId(String(task.id));
                } else {
                  setTimerRunningTaskId(null);
                }

                // Chamar o handler original
                handleStatusChange(status);
              }}
              onTimerUpdate={onTimerUpdate || (async (seconds) => { // Tornar a função assíncrona
                // Se não foi passado um onTimerUpdate, usar esta implementação padrão

                // Criar objeto de atualização explicitamente
                const updateData = {
                  timer: seconds
                };

                // Mostrar toast de informação
                toast.info('Atualizando tempo da tarefa...');

                try {
                  const response = await onUpdateTaskApi(task.id, updateData); // Usar a prop onUpdateTaskApi
                  toast.success('Tempo da tarefa atualizado com sucesso!');

                  // Atualizar o estado local da tarefa com o valor retornado da API
                  if (response && response.timer !== undefined) {
                    // Criar uma cópia do objeto de tarefas (para o componente pai)
                    if (onTaskStatusChange) {
                      // Notificar o componente pai sobre a mudança para atualizar o estado local
                      // Usamos o mesmo método que é usado para atualizar o status
                      onTaskStatusChange(task.id, task.status);
                    }
                  }
                } catch (err) {
                  console.error('Erro ao atualizar timer da tarefa:', err);
                  toast.error('Erro ao atualizar timer');
                }
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para renderizar uma tarefa arrastável
const SortableTaskCard = ({
  id,
  task,
  onClick,
  onTaskStatusChange,
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate, // Esta prop espera (taskId: string, seconds: number) de Column, mas TaskCard passa (seconds: number)
  onUpdateTaskApi, // Nova prop
  onDuplicateTask // Nova prop para duplicar
}: {
  id: string,
  task: KanbanTask, // Alterado para KanbanTask
  onClick: () => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void, // Mantido como (seconds: number) para corresponder ao TaskCard
  onUpdateTaskApi: (id: number, data: UpdateTaskRequest) => Promise<any>, // Nova prop
  onDuplicateTask?: (task: KanbanTask) => void, // Nova prop para duplicar
}) => {
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
      <TaskCard
        task={task}
        onClick={onClick}
        onTaskStatusChange={onTaskStatusChange}
        timerRunningTaskId={timerRunningTaskId}
        setTimerRunningTaskId={setTimerRunningTaskId}
        onTimerUpdate={onTimerUpdate}
        onUpdateTaskApi={onUpdateTaskApi}
        onDuplicateTask={onDuplicateTask} // Passar a prop de duplicar
      />
    </div>
  );
};

// Componente para área droppable
const DroppableColumn = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id
  });

  // Efeito para observar quando o mouse está sobre a coluna (pode ser usado para feedback visual)
  React.useEffect(() => {
    // console.log(`Mouse over column: ${id}, isOver: ${isOver}`);
  }, [isOver, id]);

  return (
    <div
      ref={setNodeRef}
      className={`p-2 flex-1 min-h-[50px] transition-colors duration-200 ${isOver ? 'bg-accent/20 ring-2 ring-accent/50' : ''}`}
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
  onTaskStatusChange,
  id, // id da coluna
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate,
  boardMode, // Adicionar boardMode como prop
  onUpdateTaskApi, // Nova prop
  onDuplicateTask // Nova prop para duplicar
}: {
  column: ProcessedKanbanColumn, // Usar ProcessedKanbanColumn
  tasks: KanbanTask[], // Usar KanbanTask
  onAddTask: (columnId: string) => void,
  onTaskClick: (task: KanbanTask) => void, // Passar a task inteira
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  id: string,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (taskId: string, seconds: number) => void, // Modificado para incluir taskId
  boardMode: BoardMode; // Adicionado tipo para boardMode
  onUpdateTaskApi: (id: number, data: UpdateTaskRequest) => Promise<any>; // Nova prop
  onDuplicateTask?: (task: KanbanTask) => void; // Nova prop para duplicar
}) => {
  // Hook de permissões
  const permissions = usePermissions();

  // Determinar se o botão de adicionar tarefa deve ser exibido
  const showAddTaskButton = !(permissions.isMember && (boardMode === 'tasks-view' || boardMode === 'project-view'));


  return (
    <div
      className="kanban-column flex-shrink-0 w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden"
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
            {showAddTaskButton && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(id)}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            )}
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
              onClick={() => onTaskClick(task)}
              onTaskStatusChange={onTaskStatusChange}
              timerRunningTaskId={timerRunningTaskId}
              setTimerRunningTaskId={setTimerRunningTaskId}
              onTimerUpdate={(seconds) => onTimerUpdate && onTimerUpdate(String(task.id), seconds)}
              onUpdateTaskApi={onUpdateTaskApi}
              onDuplicateTask={onDuplicateTask} // Passar a prop de duplicar
            />
          ))}
        </SortableContext>
      </DroppableColumn>
    </div>
  );
};

export const KanbanBoard = React.forwardRef<unknown, KanbanBoardProps>((props, ref) => {
  const {
    rawTasks,
    viewMode,
    boardMode,
    filters,
    projectId,
    // project, // project prop pode não ser mais necessária se rawTasks e filters cobrem tudo
    // onTasksUpdated, // Removido
    onTaskStatusChange, // ADICIONE
    onGenericTaskUpdate // ADICIONE
  } = props;

  // Consumir o hook useProcessedKanbanData
  const {
    columns: processedColumns, // Renomear para evitar conflito com a 'Column' local
    tasksMap: processedTasksMap, // Renomear para evitar conflito
    columnOrder: processedColumnOrder,
    isLoading: processedDataIsLoading, // Estado de loading do hook
    error: processedDataError, // Estado de erro do hook
  } = useProcessedKanbanData({
    rawTasks,
    viewMode,
    boardMode,
    filters,
    projectId: projectId !== undefined ? String(projectId) : undefined,
  });

  // Hooks de autenticação e permissões
  const { user } = useAuth();
  const permissions = usePermissions();

  // Estado para o item ativo durante o drag
  const [activeId, setActiveId] = useState<string | null>(null);
  // const [activeTaskState, setActiveTaskState] = useState<KanbanTask | null>(null); // activeTask será derivado de processedTasksMap

  // Estados para o modal de detalhes da tarefa
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<KanbanTask | null>(null);

  // Estado para o diálogo de criação/edição de tarefa
  const [isCreateEditDialogOpen, setIsCreateEditDialogOpen] = useState(false);
  const [currentColumnIdForNewTask, setCurrentColumnIdForNewTask] = useState<string | null>(null);
  const [createTaskFormInstanceId, setCreateTaskFormInstanceId] = useState<string | null>(null); // Novo estado
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null);
  const createTaskFormRef = useRef<TaskFormRef>(null); // Ref para o TaskForm de criação
  const [currentTimerValues, setCurrentTimerValues] = useState<Record<string, number>>({});
  
  // Estados para duplicação de tarefa
  const [duplicateTaskData, setDuplicateTaskData] = useState<KanbanTask | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  const { tasks } = useBackendServices();
  const { mutateAsync: updateTask } = tasks.useUpdateTask();
  const { mutateAsync: createTask } = tasks.useCreateTask();

  // Função wrapper para onUpdateTaskApi
  const handleUpdateTaskApi = useCallback(async (id: number, data: UpdateTaskRequest) => {
    return updateTask({ id, data });
  }, [updateTask]);

  // Log para depuração do estado do modal do KanbanBoard

  // Função para fechar e resetar o diálogo de criação de tarefa do Kanban
  const handleCloseKanbanDialog = () => {
    setIsCreateEditDialogOpen(false);
    setCurrentColumnIdForNewTask(null); 
    // Resetar estados de duplicação
    setDuplicateTaskData(null);
    setIsDuplicateMode(false);
    // Resetar o instanceId pode ajudar a garantir que o TaskForm seja remontado se necessário,
    // mas pode ser opcional dependendo do comportamento desejado.
    // Por ora, vamos manter o reset para maior clareza de estado.
    setCreateTaskFormInstanceId(null); 
  };

  // Função para lidar com duplicação de tarefa
  const handleDuplicateTask = useCallback((task: KanbanTask) => {
    // Preparar dados da tarefa duplicada
    const duplicatedData = {
      ...task,
      title: `${task.title} - Cópia`,
      status: 'a_fazer' as TaskStatus, // Reset status para 'a_fazer'
      timer: 0, // Reset timer
      order: undefined, // Deixar o backend definir a ordem
      // Remover campos que não devem ser copiados
      id: undefined as any,
      created_at: undefined,
      updated_at: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };

    setDuplicateTaskData(duplicatedData);
    setIsDuplicateMode(true);
    setCreateTaskFormInstanceId(`duplicate-task-${Date.now()}`);
    setIsCreateEditDialogOpen(true);
  }, []);

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

  // As funções fetchTasks, filterTasks, distributeTasksToColumns e processTasks foram removidas.
  // A lógica de busca, filtragem e geração de colunas agora é tratada pelos componentes pais
  // e pelo hook useProcessedKanbanData.

  // Não é mais necessário expor fetchTasks via ref, pois o KanbanBoard não busca mais seus dados.
  useImperativeHandle(ref, () => ({
    // Se houver outros métodos que o pai precise chamar, eles podem ser expostos aqui.
    // Por enquanto, não há necessidade de fetchTasks.
  }));

  // O useEffect que chamava fetchTasks na mudança de viewMode foi removido.
  // O hook useProcessedKanbanData já reage a mudanças em viewMode.

  // Efeito para atualizar o valor atual do timer quando ele está em execução
  useEffect(() => {
    if (!timerRunningTaskId) return;

    const task = processedTasksMap[timerRunningTaskId];
    if (task) {
      // Sempre define/reseta o valor do timer para a tarefa ativa ao iniciar/trocar o timer.
      // Isso garante que começamos a contar do valor correto da tarefa (vindo da API via processedTasksMap).
      setCurrentTimerValues(prev => ({
        ...prev,
        [timerRunningTaskId]: task.timer || 0,
      }));
    }

    // Criar um intervalo para incrementar o timer a cada segundo
    const interval = setInterval(() => {
      setCurrentTimerValues(prev => {
        const currentValue = prev[timerRunningTaskId] || 0;
        return {
          ...prev,
          [timerRunningTaskId]: currentValue + 1
        };
      });
    }, 1000);

    // Limpar o intervalo quando o componente for desmontado ou o timer parar
    return () => {
      clearInterval(interval);
      // A lógica de salvar o timer foi movida para handleDragEnd e handleTaskStatusChange
      // para garantir que o valor mais recente de currentTimerValues seja usado.
    };
  }, [timerRunningTaskId, processedTasksMap]); // Manter processedTasksMap como dependência

  // Função chamada quando o usuário começa a arrastar um item
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
  };

  // Função para encontrar a coluna que contém um determinado ID de tarefa
  // Agora usa processedColumns do hook.
  const findColumnOfTask = useCallback((taskId: string): string | null => {
    for (const [columnId, columnData] of Object.entries(processedColumns)) {
      if (columnData.taskIds.includes(taskId)) {
        return columnId;
      }
    }
    return null;
  }, [processedColumns]);

  // Função chamada quando o usuário termina de arrastar um item
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;


    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Não resetar activeId aqui ainda, pois precisamos dele para a lógica do timer
    // setActiveId(null); // Movido para o final do bloco try/catch/finally

    if (activeIdStr === overIdStr && !processedColumns[overIdStr]) { // Se soltar sobre si mesmo, mas não numa coluna
      // Se soltou sobre si mesmo (mesma tarefa), não faz nada a menos que seja para reordenar na mesma coluna.
      // A lógica de reordenação já trata isso.
      // Se overIdStr não é uma coluna, e activeIdStr === overIdStr, significa que soltou sobre si mesmo.
      // Se for uma coluna, a lógica abaixo de encontrar destinationColumnId tratará.
      // Se não for uma coluna e for a mesma tarefa, não há mudança de coluna ou ordem real.
       setActiveId(null);
      return;
    }

    const sourceColumnId = findColumnOfTask(activeIdStr);
    if (!sourceColumnId) {
      setActiveId(null);
      return;
    }

    let destinationColumnId = overIdStr;
    // Se overIdStr não é uma chave em processedColumns, significa que 'over' é uma tarefa,
    // então precisamos encontrar a coluna dessa tarefa.
    if (!(overIdStr in processedColumns)) {
      const columnContainingOverTask = findColumnOfTask(overIdStr);
      if (columnContainingOverTask) {
        destinationColumnId = columnContainingOverTask;
      } else {
        // Se não encontrar a coluna da tarefa 'over', não faz nada ou reverte para a coluna original
        setActiveId(null);
        return;
      }
    }
    
    const taskToMove = processedTasksMap[activeIdStr];
    if (!taskToMove) {
      toast.error('Tarefa não encontrada para mover.');
      setActiveId(null);
      return;
    }

    // Lógica de atualização da API FOI MOVIDA PARA ProjectView
    try {
      let newApiStatus: TaskStatus | undefined = undefined;
      let newOrderCalculated: number | undefined = undefined;
      // Variável para guardar o status que será enviado para a prop.
      // Inicialmente, é o status atual da tarefa.
      let statusForPropCallback: TaskStatus = taskToMove.status;


      if (sourceColumnId !== destinationColumnId) { // Movendo para outra coluna
        if (viewMode === 'status') {
          const potentialNewStatus = columnToStatusMap[destinationColumnId];
          console.log(`[KanbanBoard] Movendo tarefa "${taskToMove.title}" para coluna: ${destinationColumnId}`);
          console.log(`[KanbanBoard] Status atual: ${taskToMove.status}`);
          console.log(`[KanbanBoard] Novo status mapeado: ${potentialNewStatus}`);
          console.log(`[KanbanBoard] columnToStatusMap:`, columnToStatusMap);
          
          if (potentialNewStatus && potentialNewStatus !== taskToMove.status) {
            newApiStatus = potentialNewStatus; // Este é o novo status para a API
            statusForPropCallback = newApiStatus; // Atualiza o status para o callback
            console.log(`[KanbanBoard] Definindo newApiStatus para: ${newApiStatus}`);
          } else if (!potentialNewStatus) {
            console.warn(`Status não mapeado para a coluna de destino: ${destinationColumnId}`);
          }
        } else { // viewMode === 'date' - A mudança de data não afeta o status diretamente aqui,
                 // mas a prop onTaskStatusChange em ProjectView não lida com mudança de data.
                 // A lógica de dueDate em handleDragEnd que chamava updateTask foi removida.
                 // Se a mudança de data via drag-and-drop for um requisito,
                 // onTaskStatusChange precisaria ser expandida ou uma nova prop criada.
                 // Por ora, focamos na mudança de status.
                 // Se uma tarefa for arrastada para uma coluna de data, o status não muda pelo drag-and-drop.
                 // A API updateData.dueDate foi removida daqui.
        }
      }

      // Lógica refatorada para calcular a nova ordem usando a função utilitária
      const tasksInDestColumnFiltered = (processedColumns[destinationColumnId]?.taskIds || [])
        .filter(id => id !== activeIdStr)
        .map(id => processedTasksMap[id])
        .filter(Boolean) as KanbanTask[];

        tasksInDestColumnFiltered.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Usar a função utilitária para calcular a nova ordem
        newOrderCalculated = calculateNewOrderForColumn(tasksInDestColumnFiltered, overIdStr, activeIdStr);

        const roundedNewOrder = newOrderCalculated !== undefined ? parseFloat(newOrderCalculated.toFixed(5)) : undefined;

        // Verifica se houve mudança de status ou de ordem para chamar o callback
        const statusChanged = newApiStatus !== undefined && newApiStatus !== taskToMove.status;
        const orderChanged = roundedNewOrder !== undefined && roundedNewOrder !== taskToMove.order;

        const taskToMoveIdStr = String(taskToMove.id);
        const finalDestStatus = newApiStatus || taskToMove.status;

        // Etapa 1: Lidar com o timer da tarefa que está sendo movida, se ela estava rodando e VAI PARAR.
        // Isso deve acontecer ANTES de onTaskStatusChange, que pode recarregar os dados e resetar currentTimerValues.
        if (timerRunningTaskId === taskToMoveIdStr && finalDestStatus !== 'em_andamento') {
          const currentTimeToSave = currentTimerValues[taskToMoveIdStr]; 
          setTimerRunningTaskId(null); // Para o timer localmente
          if (currentTimeToSave !== undefined) {
            // Salva o timer na API
            await handleTimerUpdate(taskToMoveIdStr, currentTimeToSave);
          }
        }

        // Etapa 2: Se houve mudança de status ou ordem, atualizar via React Query
        if (statusChanged || orderChanged) {
          const updateData: UpdateTaskRequest = { status: finalDestStatus };
          if (roundedNewOrder !== undefined) {
            updateData.order = roundedNewOrder;
          }
          
          console.log(`[KanbanBoard] Enviando dados para API:`, {
            id: Number(taskToMove.id),
            data: updateData,
            statusChanged,
            orderChanged,
            finalDestStatus
          });
          
          await updateTask({ id: Number(taskToMove.id), data: updateData });
          toast.success(`Tarefa "${taskToMove.title}" movida.`);
          
          // Notificar o ProjectView para atualizar o estado local
          if (onGenericTaskUpdate) {
            await onGenericTaskUpdate();
          }
        } else {
        }

        // Etapa 3: Lidar com o início do timer para a tarefa movida, ou parar um timer de OUTRA tarefa.
        if (finalDestStatus === 'em_andamento') {
          // Se a tarefa movida VAI PARA "em_andamento"
          // Se a tarefa movida VAI PARA "em_andamento"
          if (timerRunningTaskId && timerRunningTaskId !== taskToMoveIdStr) {
            // Outra tarefa (NÃO a que foi movida) estava com o timer rodando. Parar e salvar.
            const otherTaskTimerValue = currentTimerValues[timerRunningTaskId];
            const oldRunningTaskId = timerRunningTaskId; // Capturar antes de setTimerRunningTaskId(null) ou setTimerRunningTaskId(taskToMoveIdStr)
            // Não chamamos setTimerRunningTaskId(null) aqui ainda, pois a próxima linha pode definir para taskToMoveIdStr.
            // Apenas salvamos o tempo da tarefa anterior.
            if (otherTaskTimerValue !== undefined) {
              await handleTimerUpdate(oldRunningTaskId, otherTaskTimerValue);
            }
          }
          // TEMPORIZADOR DESABILITADO - não iniciar timer automaticamente
          // Iniciar timer para a tarefa movida (ou garantir que continue se já era ela e já estava em "em_andamento")
          // Se timerRunningTaskId já era taskToMoveIdStr, esta chamada não muda nada, o que é bom.
          // setTimerRunningTaskId(taskToMoveIdStr);
        }
        // Não precisamos de um 'else' aqui para parar o timer da tarefa movida se ela NÃO VAI PARA 'em_andamento',
        // pois isso já foi tratado na Etapa 1.

    } catch (err) {
      console.error("Erro ao processar drag-and-drop no KanbanBoard:", err);
      toast.error('Erro ao mover tarefa.');
      // A prop onTaskStatusChange em ProjectView lida com o tratamento de erro da API.
    } finally {
      setActiveId(null);
    }
  };

  // Função para encontrar o ID da tarefa a partir do objeto over
  // Esta função pode não ser mais necessária se a lógica de handleDragEnd for simplificada
  // para usar diretamente os IDs de active e over.

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTaskForModal(task);
    setIsTaskDetailsModalOpen(true);
  };

  const handleTaskModalClose = () => {
    setIsTaskDetailsModalOpen(false);
    setSelectedTaskForModal(null);
  };

  const handleTaskUpdated = async () => {
    if (onGenericTaskUpdate) { // Alterado de onTasksUpdated
      await onGenericTaskUpdate(); // Alterado de onTasksUpdated
    }
    // O hook useProcessedKanbanData reagirá à mudança em rawTasks e reprocessará os dados.
    // A lógica de timer e atualização de estado local que estava aqui foi simplificada
    // pois a fonte da verdade (rawTasks) será atualizada pelo pai.
  };

  // Função para atualizar o timer de uma tarefa
  const handleTimerUpdate = async (taskIdStr: string, seconds: number) => {
    if (!taskIdStr) return;
    const timerValue = Number(seconds);
    if (isNaN(timerValue)) {
      toast.error('Erro ao processar o tempo.');
      return;
    }

    setCurrentTimerValues(prev => ({ ...prev, [taskIdStr]: timerValue }));

    try {
      await updateTask({ id: Number(taskIdStr), data: { timer: timerValue } });
      toast.success('Tempo da tarefa atualizado.');
    } catch (err) {
      toast.error('Erro ao atualizar timer da tarefa.');
    }
  };

  // Função para lidar com a mudança de status de uma tarefa (ex: pelo temporizador)
  const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const taskIdStr = String(taskId);
    const currentTask = processedTasksMap[taskIdStr]; 

    if (!currentTask) return;

    const previousTimerRunningId = timerRunningTaskId; // Capturar o ID do timer antes de qualquer mudança

    // Notificar o pai sobre a mudança de status para que ele atualize a API e rawTasks
    // Somente se o status realmente mudou.
    if (currentTask.status !== newStatus) {
      if (onTaskStatusChange) { // Prop do KanbanBoard (Tasks.handleKanbanTaskStatusChange)
        await onTaskStatusChange(currentTask, newStatus); // Isso vai atualizar rawTasks, e então processedTasksMap
      }
    }

    // Lógica do timer local ao KanbanBoard, baseada no newStatus
    // Esta lógica é acionada pela interação do usuário com o TaskTimer (via TaskCard)
    if (newStatus === 'em_andamento') {
      if (previousTimerRunningId && previousTimerRunningId !== taskIdStr) {
        // Outra tarefa estava com o timer rodando, parar e salvar o timer dela.
        const previousTimerValue = currentTimerValues[previousTimerRunningId];
        if (previousTimerValue !== undefined) {
          await handleTimerUpdate(previousTimerRunningId, previousTimerValue);
        }
      }
      // TEMPORIZADOR DESABILITADO - não iniciar timer automaticamente
      // setTimerRunningTaskId(taskIdStr);
      // O useEffect de timerRunningTaskId pegará o valor de task.timer do processedTasksMap atualizado
      // para inicializar currentTimerValues[taskIdStr] se necessário.
    } else if (previousTimerRunningId === taskIdStr && previousTimerRunningId !== null) {
      // O timer desta tarefa (taskIdStr) estava rodando (previousTimerRunningId === taskIdStr)
      // e o status mudou para algo que não é 'em_andamento'
      // (ou o usuário pausou o timer manualmente, o que também pode mudar o status para a_fazer)
      setTimerRunningTaskId(null); // Para o timer
      const currentTime = currentTimerValues[taskIdStr]; // Pega o valor mais recente de currentTimerValues
      if (currentTime !== undefined) {
        await handleTimerUpdate(taskIdStr, currentTime); // Salva
      }
    }
    // Se o status não mudou (ex: tarefa já 'em_andamento' e usuário clica play),
    // o TaskTimer em si já lida com onStatusChange("Em Andamento").
    // Se newStatus é 'em_andamento' e timerRunningTaskId já é taskIdStr, nada precisa ser feito aqui.
    // Se newStatus é 'em_andamento' e timerRunningTaskId é null ou diferente, a lógica acima cobre.
  };

const handleTaskFormSuccess = async (newTaskFromForm: Task) => {
  // A TaskForm já executou a mutação (createTask ou updateTask)
  // e esta função (onSuccess do TaskForm) é chamada apenas se a mutação foi bem-sucedida.
  // O TaskForm em si já lida com o toast.error da mutação da API.

  // 1. Mostrar o toast de sucesso específico do Kanban e fechar o diálogo.
  try {
    handleCloseKanbanDialog();
    
    if (isDuplicateMode) { // isDuplicateMode é um estado do KanbanBoard
      toast.success('Tarefa duplicada com sucesso no quadro!'); // Mensagem específica do Kanban
    } else {
      toast.success('Tarefa criada com sucesso no quadro!'); // Mensagem específica do Kanban
    }
  } catch (dialogOrToastError) {
    // Erro ao fechar diálogo ou ao mostrar toast de sucesso (muito improvável, mas para robustez)
    console.error('[KanbanBoard.tsx] Erro ao fechar diálogo ou mostrar toast de sucesso:', dialogOrToastError);
    // Não há muito o que fazer aqui, a tarefa já foi criada/duplicada.
    // Talvez um toast genérico de erro de UI, se necessário.
  }

  // 2. Tentar atualizar a lista de tarefas do quadro.
  if (onGenericTaskUpdate) {
    try {
      await onGenericTaskUpdate();
    } catch (updateError) {
      console.error('[KanbanBoard.tsx] Erro durante onGenericTaskUpdate (atualização do quadro):', updateError);
      // A tarefa FOI criada/duplicada com sucesso.
      // Apenas a atualização da visualização do quadro falhou.
      toast.warning('A tarefa foi salva, mas houve um problema ao atualizar o quadro. Tente atualizar a página.');
    }
  }
  
  // Resetar o modo de duplicação se aplicável
  if (isDuplicateMode) {
    setIsDuplicateMode(false);
    setDuplicateTaskData(null);
  }
};

  // A ordem das colunas (processedColumnOrder) vem do hook useProcessedKanbanData
  // As colunas (processedColumns) e o mapa de tarefas (processedTasksMap) também vêm do hook.

  if (processedDataIsLoading) {
    return (
      <div className="h-full">
        <div className="kanban-container flex gap-4 h-full overflow-x-auto overflow-y-hidden pb-4" style={{ minWidth: 'calc(280px * 7 + 1rem * 6)' }}>
          {(processedColumnOrder.length > 0 ? processedColumnOrder : statusColumnOrder).map(columnId => ( // Fallback para statusColumnOrder se processedColumnOrder estiver vazio durante o loading inicial
            <div key={columnId} className="kanban-column flex-shrink-0 w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden">
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
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-16" />
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
  
  const activeTask = activeId ? processedTasksMap[activeId] : null;

  return (
    <div className="h-full w-full">
      {processedDataError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{processedDataError}</AlertDescription>
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={true}
      >
        <div className="kanban-container flex gap-4 h-full w-full overflow-x-auto overflow-y-hidden" style={{ minWidth: 'calc(280px * 7 + 1rem * 6)' }}>
          {processedColumnOrder.map(columnId => {
            const columnData = processedColumns[columnId];
            if (!columnData) {
              // Isso não deve acontecer se useProcessedKanbanData estiver funcionando corretamente
              // Mas como fallback, podemos renderizar uma coluna vazia ou um placeholder.
              console.warn(`Dados da coluna ${columnId} não encontrados.`);
              return (
                <div key={columnId} className="kanban-column flex-shrink-0 w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden p-3">
                  <h3 className="font-medium">{columnId} (Erro)</h3>
                </div>
              );
            }

            const tasksInColumn = columnData.taskIds.map(taskId => processedTasksMap[taskId]).filter(Boolean) as KanbanTask[];

            return (
              <Column
                key={columnData.id}
                id={columnData.id} // id da coluna
                column={columnData}
                tasks={tasksInColumn}
                boardMode={boardMode} // Passar boardMode para Column
                onAddTask={(colId) => {
                  setCurrentColumnIdForNewTask(colId);
                  setCreateTaskFormInstanceId(`kanban-create-task-${Date.now()}`); // Gerar ID único
                  setIsCreateEditDialogOpen(true);
                }}
                onTaskClick={handleTaskClick}
                onTaskStatusChange={handleTaskStatusChange}
                timerRunningTaskId={timerRunningTaskId}
                setTimerRunningTaskId={setTimerRunningTaskId}
                onTimerUpdate={handleTimerUpdate}
                onUpdateTaskApi={handleUpdateTaskApi}
                onDuplicateTask={handleDuplicateTask} // Passar a função de duplicar
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px] opacity-80 shadow-lg">
              <TaskCard
                onClick={() => handleTaskClick(activeTask)} // Usar a função de clique do KanbanBoard
                onTaskStatusChange={handleTaskStatusChange}
                timerRunningTaskId={timerRunningTaskId}
                setTimerRunningTaskId={setTimerRunningTaskId}
                onTimerUpdate={(seconds) => activeTask && handleTimerUpdate(String(activeTask.id), seconds)}
                onUpdateTaskApi={handleUpdateTaskApi}
                onDuplicateTask={handleDuplicateTask} // Passar a função de duplicar
                task={activeTask}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTaskForModal && typeof selectedTaskForModal.id === 'number' && ( // Garante que id é number
        <TaskDetailsModal
          isOpen={isTaskDetailsModalOpen}
          onClose={handleTaskModalClose}
          taskId={selectedTaskForModal.id}
          onTaskUpdated={handleTaskUpdated}
          timerRunningTaskId={timerRunningTaskId}
          currentTimerValues={currentTimerValues}
          setCurrentTimerValues={setCurrentTimerValues}
          setTimerRunningTaskId={setTimerRunningTaskId}
        />
      )}

      <Dialog 
        key={createTaskFormInstanceId || 'kanban-create-dialog'} 
        open={isCreateEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            handleCloseKanbanDialog();
          } else {
            // Se estiver abrindo, o KanbanBoard já define o instanceId e currentColumnId
            // onde o botão de "+" é clicado.
            setIsCreateEditDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isDuplicateMode ? 'Duplicar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              {isDuplicateMode 
                ? 'Edite os detalhes da tarefa duplicada conforme necessário.'
                : 'Preencha os detalhes da tarefa. Clique em salvar quando terminar.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TaskForm
              key={createTaskFormInstanceId || 'kanban-create-form'}
              ref={createTaskFormRef}
              onSuccess={handleTaskFormSuccess}
              defaultProjectId={projectId ? Number(projectId) : undefined}
              defaultStatus={isDuplicateMode 
                ? duplicateTaskData?.status 
                : (currentColumnIdForNewTask ? columnToStatusMap[currentColumnIdForNewTask] : undefined)
              }
              formInstanceId={createTaskFormInstanceId || undefined}
              initialData={isDuplicateMode ? duplicateTaskData : undefined}
              isDuplicateMode={isDuplicateMode}
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseKanbanDialog} // Usa a função centralizada
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                createTaskFormRef.current?.triggerSubmit();
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
