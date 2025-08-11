import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// ... outros imports
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, AlertCircle, Repeat, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { KanbanTask } from '@/components/kanban/kanbanTypes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { TasksList } from '@/components/dashboard/TasksList';
import { TaskForm } from '@/components/forms/TaskForm';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Project, Task, TaskStatus, User, TaskPriority, UpdateTaskRequest } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { TaskFormRef } from '@/components/forms/TaskForm';
import { RecurringTasksList } from '@/components/recurring/RecurringTasksList';

const Tasks = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecurringTasksDialogOpen, setIsRecurringTasksDialogOpen] = useState(false);
  const [taskFormKey, setTaskFormKey] = useState(0);
  const successCallbackInstanceCounter = useRef(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsWithTasks, setProjectsWithTasks] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // NOVO ESTADO PARA FILTRO DE USUÁRIO
  const [allUsers, setAllUsers] = useState<User[]>([]); // NOVO ESTADO PARA TODOS OS USUÁRIOS
  const [searchTerm, setSearchTerm] = useState(''); // NOVO ESTADO PARA BUSCA DE TAREFAS
  const [viewMode, setViewMode] = useState<'status' | 'date'>('status');
  const [showCompleted, setShowCompleted] = useState(() => {
    const savedShowCompleted = localStorage.getItem('showCompletedTasksPage');
    return savedShowCompleted === 'true';
  });
  const [showMyReviews, setShowMyReviews] = useState(() => {
    const savedShowMyReviews = localStorage.getItem('showMyReviewsTasksPage');
    return savedShowMyReviews === 'true';
  });
  const [refreshing, setRefreshing] = useState(false);
  const tasksListRef = useRef<{ fetchTasks: () => Promise<void> }>(null);
  const taskFormRef = useRef<TaskFormRef>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  // Extrair valores primitivos para estabilizar dependências de useCallback
  const currentUserIdAuth = user?.id; // Renomeado para evitar conflito com selectedUserId (estado do filtro)
  const isUserMember = permissions.isMember;
  // const [kanbanFilteredProjectIds, setKanbanFilteredProjectIds] = useState<Set<number> | null>(null); // Removido

  const searchParams = new URLSearchParams(location.search);
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  const { users: usersService, projects: projectsService, tasks } = useBackendServices();
  const { mutateAsync: createTask } = tasks.useCreateTask();
  const { mutateAsync: updateTask } = tasks.useUpdateTask();
  const { data: usersData = [] } = usersService.useGetUsers();
  const { data: projectsData = [] } = projectsService.useGetProjects();

  const {
    data: tasksData = [],
    isLoading,
    isError,
    refetch,
  } = tasks.useGetTasks();

  useEffect(() => {
    setRawTasks(tasksData);
  }, [tasksData]);



  // Atualizar lista de usuários quando a query for carregada
  useEffect(() => {
    setAllUsers(Array.isArray(usersData) ? usersData : []);
  }, [usersData]);

  // useEffect para buscar projetos e atualizar a lista de projetos com tarefas
  useEffect(() => {
    const fetchProjectsAndRelatedData = async () => {
      // setLoading(true); // O loading principal é para rawTasks
      setError(null); // Limpar erro específico de projetos
      try {
        const projectsList = projectsData;
        setProjects(projectsList);

        if (projectId) {
          const projectDetails = projectsList.find(p => p.id === projectId);
          if (projectDetails) {
            setCurrentProject(projectDetails);
          } else {
            setError('Projeto não encontrado ou inacessível.');
          }
        }

        // Atualizar projectsWithTasks baseado nas rawTasks já carregadas
        if (rawTasks.length > 0) {
          const projectIdsInRawTasks = new Set<number>();
          rawTasks.forEach(task => {
            const taskProjectId = typeof task.project_id === 'string'
              ? parseInt(task.project_id)
              : task.project_id;
            if (taskProjectId) {
              projectIdsInRawTasks.add(taskProjectId);
            }
          });
          const projectsWithTasksList = projectsList.filter(project =>
            projectIdsInRawTasks.has(typeof project.id === 'string' ? parseInt(project.id) : project.id)
          );
          setProjectsWithTasks(projectsWithTasksList);
        } else {
          // Se rawTasks ainda não carregou ou está vazia, podemos tentar uma lógica alternativa
          // ou simplesmente esperar que rawTasks seja preenchida.
          // Por ora, se rawTasks estiver vazia, projectsWithTasks também estará (ou usará todos os projetos).
           setProjectsWithTasks(projectsList); // Ou uma lista vazia se preferir até rawTasks carregar
        }

      } catch (err) {
        // Não sobrescrever o erro de carregamento de tarefas, se houver
        if (!error) setError('Não foi possível carregar os projetos.');
      }
      // setLoading(false); // O loading principal é para rawTasks
    };
    fetchProjectsAndRelatedData();
  }, [projectId, rawTasks, error, projectsData]); // Depender de rawTasks e projectsData para atualizar projectsWithTasks

  const handleKanbanTaskStatusChange = async (
    task: KanbanTask,
    newStatus: TaskStatus, // TaskStatus de @/lib/types
    newOrder?: number
  ) => {
    try {
      const updateData: UpdateTaskRequest = { status: newStatus };
      if (newOrder !== undefined) {
        // TESTE: Enviar order como inteiro arredondado
        updateData.order = newOrder;
      }
      await updateTask({ id: Number(task.id), data: updateData });
      await refetch();
    } catch (error) {
      toast.error(`Falha ao atualizar tarefa "${task.title}".`);
      await refetch();
    }
  };

  const handleKanbanGenericTaskUpdate = async () => {
    await refetch();
  };

  const handleUpdateTaskApi = useCallback(async (taskId: number, data: UpdateTaskRequest) => {
    try {
      await updateTask({ id: taskId, data });
    } catch (error) {
      console.error('Erro ao atualizar tarefa via API:', error);
      throw error;
    }
  }, [updateTask]);

  const handleTaskFormSuccess = useCallback(async (taskData: any) => {
    const callbackId = successCallbackInstanceCounter.current;
    try {
      // taskData já é a tarefa criada pelo TaskForm, não precisa criar novamente
      const newTask = taskData;
      
      setIsDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');
      
      // Atualizar rawTasks localmente
      setRawTasks(prevRawTasks => [...prevRawTasks, newTask]);

      if (tasksListRef.current && activeTab === 'list') {
        tasksListRef.current.fetchTasks();
      }

      const newProjectId = typeof taskData.project_id === 'string'
        ? parseInt(taskData.project_id)
        : taskData.project_id;

      if (newProjectId) {
        const projectExists = projectsWithTasks.some(p => {
          const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
          return pId === newProjectId;
        });
        if (!projectExists) {
          const project = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
            return pId === newProjectId;
          });
          if (project) {
            setProjectsWithTasks(prev => [...prev, project]);
          }
        }
      }
    } catch (error) {
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    }
  }, [activeTab, projects, projectsWithTasks, setIsDialogOpen, setRawTasks, setProjectsWithTasks, tasksListRef]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      setSelectedPriorityFilter(null);
    } else {
      setSelectedPriorityFilter(value);
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectFilter(null);
    } else {
      setSelectedProjectFilter(Number(value));
    }
  };

  const handleUserChange = (value: string) => {
    if (value === 'all') {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(Number(value));
    }
  };

  const handleViewModeChange = (value: 'status' | 'date') => {
    setViewMode(value);
  };

  const handleShowCompletedChange = (checked: boolean) => {
    setShowCompleted(checked);
    localStorage.setItem('showCompletedTasksPage', String(checked));
  };

  const handleShowMyReviewsChange = (checked: boolean) => {
    setShowMyReviews(checked);
    localStorage.setItem('showMyReviewsTasksPage', String(checked));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Memoized filtered tasks to avoid re-calculating on every render
  const filteredTasks = useMemo(() => {
    let tasksToFilter = [...rawTasks];

    // Apply search filter
    if (searchTerm.trim()) {
      tasksToFilter = tasksToFilter.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply project filter
    if (selectedProjectFilter !== null) {
      tasksToFilter = tasksToFilter.filter(task => {
        const taskProjectId = typeof task.project_id === 'string' ? parseInt(task.project_id) : task.project_id;
        return taskProjectId === selectedProjectFilter;
      });
    }

    // Apply priority filter
    if (selectedPriorityFilter !== null) {
      tasksToFilter = tasksToFilter.filter(task => task.priority === selectedPriorityFilter);
    }

    // Apply user filter (novo filtro de responsável)
    if (selectedUserId !== null) {
      tasksToFilter = tasksToFilter.filter(task =>
        task.users && task.users.some(userRef =>
          (typeof userRef === 'number' && userRef === selectedUserId) ||
          (typeof userRef === 'object' && userRef !== null && userRef.id === selectedUserId)
        )
      );
    }

    // Apply show completed filter
    if (!showCompleted) {
      tasksToFilter = tasksToFilter.filter(task => task.status !== 'concluido');
    }

    // Apply my reviews filter (only for admins and managers)
    if (showMyReviews && currentUserIdAuth) {
      tasksToFilter = tasksToFilter.filter(task => 
        task.task_reviewer_id === currentUserIdAuth || task.taskReviewerId === currentUserIdAuth
      );
    }

    // Apply member filter (if user is a member, only show their tasks)
    // Este filtro é aplicado DEPOIS do filtro de selectedUserId,
    // o que significa que se um membro selecionar "Todos os Responsáveis", ele ainda verá apenas suas tarefas.
    // Se a intenção for que "Todos os Responsáveis" mostre TUDO para um membro, esta lógica precisaria ser ajustada.
    if (isUserMember && currentUserIdAuth) {
      tasksToFilter = tasksToFilter.filter(task => {
        if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;
        return task.users.some(taskUser =>
          (typeof taskUser === 'number' && taskUser === currentUserIdAuth) ||
          (typeof taskUser === 'object' && taskUser !== null && taskUser.id === currentUserIdAuth)
        );
      });
    }

    return tasksToFilter;
  }, [rawTasks, searchTerm, selectedProjectFilter, selectedPriorityFilter, selectedUserId, showCompleted, showMyReviews, isUserMember, currentUserIdAuth]);

  return (
    <AppLayout>
      {/* Modal para Tarefas Recorrentes */}
      <Dialog open={isRecurringTasksDialogOpen} onOpenChange={setIsRecurringTasksDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Tarefas Recorrentes</DialogTitle>
            <DialogDescription>
              Crie, edite e visualize todas as suas regras de recorrência.
            </DialogDescription>
          </DialogHeader>
          <RecurringTasksList />
        </DialogContent>
      </Dialog>

      <div className="-m-4 md:-m-6">
        <div className="flex flex-col gap-6 p-0">
        {(error || isError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Falha ao carregar tarefas.'}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pt-[30px] px-[30px] pb-0">
          <div>
            {isLoading && !filteredTasks.length ? ( // Ajustado para considerar filteredTasks no loading inicial
              <div className="flex flex-col">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            ) : currentProject ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate('/projects')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Tarefas do Projeto
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    {currentProject.title}
                  </p>
                  <Badge variant={currentProject.priority === 'urgente' ? "destructive" :
                                 currentProject.priority === 'alta' ? "destructive" :
                                 currentProject.priority === 'media' ? "default" : "secondary"}>
                    Prioridade {currentProject.priority.charAt(0).toUpperCase() + currentProject.priority.slice(1)}
                  </Badge>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
                <p className="text-muted-foreground">
                  Visualize e gerencie todas as suas tarefas.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              placeholder="Buscar tarefas..."
              className="w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {permissions.canCreateTasks && !permissions.isMember && (
              <Button variant="outline" className="gap-1" disabled={isLoading} onClick={() => setIsRecurringTasksDialogOpen(true)}>
                <Repeat className="h-4 w-4" />
                Tarefas Recorrentes
              </Button>
            )}
            {permissions.canCreateTasks && !permissions.isMember && (
              <Button className="gap-1" disabled={isLoading} onClick={() => {
                const newKey = taskFormKey + 1;
                setTaskFormKey(newKey);
                setIsDialogOpen(true);
              }}>
                <PlusCircle className="h-4 w-4" />
                Nova Tarefa
              </Button>
            )}
          </div>
          {isDialogOpen && (
            <Dialog key={`dialog-${taskFormKey}`} open={isDialogOpen} onOpenChange={(open) => {
              // Se estiver fechando o diálogo, podemos incrementar o contador para a próxima vez que handleTaskFormSuccess for definido
              if (!open) {
                successCallbackInstanceCounter.current += 1;
              }
              setIsDialogOpen(open);
            }}> {/* Adicionada key ao Dialog */}
              <DialogContent
                className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
              >
                <DialogHeader>
                  <DialogTitle>Criar Nova Tarefa</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes da tarefa. Clique em salvar quando terminar.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <TaskForm
                    key={`taskform-${taskFormKey}`}
                    ref={taskFormRef}
                    onSuccess={handleTaskFormSuccess}
                    defaultProjectId={projectId}
                    formInstanceId={`tasks-page-create-dialog-${taskFormKey}`}
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      taskFormRef.current?.triggerSubmit();
                    }}
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Tabs defaultValue="kanban" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-between items-center mb-4 mx-[30px]">
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="list">Lista</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="icon"
                title="Atualizar lista"
                onClick={handleRefresh}
                disabled={refreshing}
                className={refreshing ? "animate-spin" : ""}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap"> {/* Adicionado flex-wrap */}
              <Select
                value={selectedPriorityFilter || 'all'}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedProjectFilter ? String(selectedProjectFilter) : 'all'}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projectsWithTasks
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {permissions.isAdmin && (
                <Select // NOVO FILTRO DE USUÁRIO
                  value={selectedUserId?.toString() || 'all'}
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {allUsers
                      .sort((a, b) => (a.name || `Usuário ${a.id}`).localeCompare(b.name || `Usuário ${b.id}`))
                      .map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name || `Usuário ${u.id}`} {/* Fallback para nome de usuário */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={viewMode}
                onValueChange={handleViewModeChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Visualização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Por Status</SelectItem>
                  <SelectItem value="date">Por Data</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm">Mostrar Concluídas</span>
                <Switch
                  checked={showCompleted}
                  onCheckedChange={handleShowCompletedChange}
                />
              </div>
              {(permissions.isAdmin || permissions.isManager) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Minhas Revisões</span>
                  <Switch
                    checked={showMyReviews}
                    onCheckedChange={handleShowMyReviewsChange}
                  />
                </div>
              )}
            </div>
          </div>
          <TabsContent value="kanban" className="mt-6 pb-0">
            <div className="overflow-x-auto pb-0 mb-0">
              <div className="min-h-[73.7vh]" style={{ minWidth: 'calc(280px * 7 + 1rem * 6)', padding:"0px 30px"}}>
                {isLoading && !filteredTasks.length ? (
                  <Skeleton className="w-full h-[500px]" />
                ) : (
                  <KanbanBoard
                    rawTasks={filteredTasks} // Passando as tarefas já filtradas
                    boardMode="tasks-view"
                    viewMode={viewMode}
                    filters={{
                      priority: selectedPriorityFilter ? selectedPriorityFilter as TaskPriority : undefined,
                      projectId: selectedProjectFilter || projectId,
                      userId: selectedUserId, // Usando o estado do filtro de usuário
                      showCompleted: showCompleted,
                      showMyReviews: showMyReviews,
                    }}
                    onTaskStatusChange={handleKanbanTaskStatusChange}
                    onGenericTaskUpdate={handleKanbanGenericTaskUpdate}
                    onUpdateTaskApi={handleUpdateTaskApi}
                  />
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <div className="border rounded-lg p-4">
              <TasksList
                ref={tasksListRef}
                projectId={selectedProjectFilter || projectId} // Passando projectId do filtro ou URL
                selectedTeamId={null} // Não há filtro de equipe nesta página
                selectedUserId={selectedUserId} // Passando o ID do usuário do filtro
                priorityFilter={selectedPriorityFilter ? selectedPriorityFilter as TaskPriority : undefined} // Passando prioridade
                viewMode={viewMode}
                forceUserFilter={isUserMember} // Mantendo a lógica de forçar filtro de usuário para membros
                showCompleted={showCompleted}
                showMyReviews={showMyReviews}
                showProject={true} // Forçar exibição da coluna de projeto
                onTasksUpdated={async () => { await refetch(); }} // Callback para atualizar a lista principal
              />
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default Tasks;
