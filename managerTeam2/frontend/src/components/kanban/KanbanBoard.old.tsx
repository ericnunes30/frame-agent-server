import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { PlusCircle, MoreHorizontal, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { taskService, Task, TaskStatus } from '@/lib/api';

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
  done: 'concluido'
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
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<KanbanColumns>({
    todo: { id: 'todo', title: 'A Fazer', taskIds: [] },
    inProgress: { id: 'inProgress', title: 'Em Progresso', taskIds: [] },
    review: { id: 'review', title: 'Revisão', taskIds: [] },
    done: { id: 'done', title: 'Concluído', taskIds: [] },
  });
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar tarefas da API
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Carregar tarefas do projeto ou todas as tarefas
      const tasksList = projectId
        ? await taskService.getTasksByProject(projectId)
        : await taskService.getTasks();

      // Transformar array de tarefas em objeto para facilitar acesso
      const tasksMap: Record<string, Task> = {};
      tasksList.forEach(task => {
        const taskId = String(task.id);
        tasksMap[taskId] = task;
      });

      setTasks(tasksMap);

      // Estrutura inicial do kanban
      const initialColumns: KanbanColumns = {
        todo: { id: 'todo', title: 'A Fazer', taskIds: [] },
        inProgress: { id: 'inProgress', title: 'Em Progresso', taskIds: [] },
        review: { id: 'review', title: 'Revisão', taskIds: [] },
        done: { id: 'done', title: 'Concluído', taskIds: [] },
      };

      // Distribuir tarefas nas colunas de acordo com seu status
      tasksList.forEach(task => {
        // Mapear o status da API para a coluna correspondente
        const columnId = statusMap[task.status] || 'todo';
        if (initialColumns[columnId]) {
          initialColumns[columnId].taskIds.push(String(task.id));
        }
      });

      setColumns(initialColumns);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Função chamada quando o usuário termina de arrastar um item
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Se não há destino ou se o item foi solto na mesma posição
    if (!destination ||
        (destination.droppableId === source.droppableId &&
         destination.index === source.index)) {
      return;
    }

    // Obter colunas de origem e destino
    const sourceColumn = columns[source.droppableId];
    const destinationColumn = columns[destination.droppableId];

    if (!sourceColumn || !destinationColumn) {
      console.error('Colunas não encontradas:', { sourceColumn, destinationColumn });
      return;
    }

    // Se movido dentro da mesma coluna
    if (sourceColumn.id === destinationColumn.id) {
      const newTaskIds = Array.from(sourceColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...sourceColumn,
        taskIds: newTaskIds,
      };

      const newColumns = {
        ...columns,
        [newColumn.id]: newColumn,
      };

      setColumns(newColumns);
      return;
    }

    // Se movido para uma coluna diferente
    const sourceTaskIds = Array.from(sourceColumn.taskIds);
    sourceTaskIds.splice(source.index, 1);
    const newSourceColumn = {
      ...sourceColumn,
      taskIds: sourceTaskIds,
    };

    const destinationTaskIds = Array.from(destinationColumn.taskIds);
    destinationTaskIds.splice(destination.index, 0, draggableId);
    const newDestinationColumn = {
      ...destinationColumn,
      taskIds: destinationTaskIds,
    };

    const newColumns = {
      ...columns,
      [newSourceColumn.id]: newSourceColumn,
      [newDestinationColumn.id]: newDestinationColumn,
    };

    // Atualizar o estado local primeiro para feedback imediato ao usuário
    setColumns(newColumns);

    // Atualizar o status da tarefa na API
    try {
      const taskId = parseInt(draggableId);

      // Mapear o ID da coluna para o status da API
      const newStatus = columnToStatusMap[destinationColumn.id];

      // Atualizar o status da tarefa na API
      await taskService.updateTask(taskId, {
        status: newStatus
      });

      // Atualizar o estado local
      const updatedTasksMap = { ...tasks };
      updatedTasksMap[draggableId] = { ...updatedTasksMap[draggableId], status: newStatus };
      setTasks(updatedTasksMap);

      toast.success(`Tarefa movida para ${destinationColumn.title}`);
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa:', err);
      toast.error('Erro ao atualizar status da tarefa. Tente novamente.');

      // Reverter as mudanças no estado local em caso de erro
      setColumns({
        ...columns,
        [sourceColumn.id]: sourceColumn,
        [destinationColumn.id]: destinationColumn,
      });
    }
  }, [columns, tasks]);

  const handleTaskClick = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (taskDate.getTime() === tomorrow.getTime()) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const columnOrder = ['todo', 'inProgress', 'review', 'done'];

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
                    <div className="flex justify-between items-start mb-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />

                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                      <Skeleton className="h-3.5 w-3.5 mr-1 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex -space-x-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-8" />
                      </div>
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

  return (
    <div className="h-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columnOrder.map(columnId => {
            const column = columns[columnId];
            if (!column) return null;

            const columnTasks = column.taskIds
              .map(taskId => tasks[taskId])
              .filter(task => task); // Filtra tarefas não encontradas

            return (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided, snapshot) => (
                  <div
                    className={`kanban-column min-w-[280px] max-w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden ${snapshot.isDraggingOver ? 'bg-accent/20' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <div className="p-3 border-b border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center">
                          {column.title}
                          <span className="ml-2 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
                            {columnTasks.length}
                          </span>
                        </h3>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/tasks/new')}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 flex-1 overflow-y-auto min-h-[50px]">
                      {columnTasks.map((task, index) => {
                        const taskId = String(task.id);
                        return (
                          <Draggable
                            key={taskId}
                            draggableId={taskId}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                                className={`p-3 mb-2 bg-background rounded-md border shadow-sm ${snapshot.isDragging ? 'ring-2 ring-primary/50' : ''}`}
                                onClick={() => handleTaskClick(task.id)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <Badge variant={priorityMap[task.priority]?.variant || 'default'} className="text-xs">
                                    {priorityMap[task.priority]?.label || 'Média'}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 -mr-1.5 -mt-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <h4 className="text-sm font-medium mb-2">{task.title}</h4>

                                {task.due_date && (
                                  <div className="flex items-center text-xs text-muted-foreground mb-2">
                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                    {formatDate(task.due_date)}
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex -space-x-2">
                                    {task.users && task.users.length > 0 ? (
                                      task.users.slice(0, 2).map((userId, i) => (
                                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                          <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                            {`U${userId}`}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))
                                    ) : (
                                      <Avatar className="h-6 w-6 border-2 border-background">
                                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                                          ?
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                    {task.users && task.users.length > 2 && (
                                      <Avatar className="h-6 w-6 border-2 border-background bg-muted">
                                        <AvatarFallback className="text-[10px] text-muted-foreground">
                                          +{task.users.length - 2}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="flex items-center text-xs">
                                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                      {0}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}

          <div className="min-w-[280px] max-w-[280px] border-2 border-dashed border-border flex items-center justify-center rounded-lg">
            <Button variant="ghost" className="flex items-center gap-2" onClick={() => fetchTasks()}>
              <PlusCircle className="h-4 w-4" />
              Atualizar Quadro
            </Button>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
