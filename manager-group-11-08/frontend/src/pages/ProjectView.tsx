
import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Calendar, Users, ChevronDown, Building2, Edit, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Card } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQueryClient } from '@tanstack/react-query';
import { Project, ProjectPriority, User, Team, UpdateTaskRequest, TaskStatus } from '@/common/types';
import { transformApiProjectToFrontend } from '@/utils/apiTransformers';
import { useBackendServices } from '@/hooks/useBackendServices';
import { getProjectQueryOptions } from '@/services/backend/projects';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { TasksList } from '@/components/dashboard/TasksList';

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [rawTasks, setRawTasks] = useState<any[]>([]); // Renomeado de tasks para rawTasks
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | 'todos'>('todos');
  const [kanbanViewMode, setKanbanViewMode] = useState<'status' | 'date'>('status');
  const [projectUsers, setProjectUsers] = useState<User[]>([]);
  const [projectOccupations, setProjectOccupations] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOccupations, setAllOccupations] = useState<Team[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { projects, users: usersService, occupations, tasks } = useBackendServices();
  const { data: usersQueryData = [] } = usersService.useGetUsers();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const tasksListRef = React.useRef<{ fetchTasks: () => Promise<void> }>(null);
  const { user } = useAuth();
  const permissions = usePermissions();

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { data: projectData, isLoading: projectLoading } = projects.useGetProject(projectIdNum, Boolean(projectId))
  const { data: occupationsQueryData = [] } = occupations.useGetOccupations()
  const { mutateAsync: deleteProjectMutation } = projects.useDeleteProject()
  const { mutateAsync: updateTaskMutation } = tasks.useUpdateTask(); // Adicionar este hook
  const queryClient = useQueryClient()

  // Referência para o componente KanbanBoard - Removida
  // const kanbanBoardRef = React.useRef<{ fetchTasks: () => Promise<void> }>(null);

  // Função para atualizar as tarefas do projeto
  const updateProjectTasks = useCallback(async () => {
    if (!projectId || !project) return; // Adicionar checagem para project (que tem o title)

    try {
      const id = parseInt(projectId);
      // Invalidar o cache e buscar dados atualizados do projeto
      await queryClient.invalidateQueries({ queryKey: ['project', id] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Aguardar um pequeno delay para evitar conflitos de queries
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Buscar dados atualizados do projeto, incluindo suas tarefas
      const currentProjectData = await queryClient.fetchQuery(
        getProjectQueryOptions(id)
      );

      if (!currentProjectData || !currentProjectData.tasks) {
        console.warn('Project data or tasks not available, skipping task update.');
        setRawTasks([]); // Limpar tarefas se não houver dados
        setProgress(0);
        return;
      }

      // Mapear as tarefas para incluir o objeto 'project' com 'title'
      // Usar currentProjectData para o título, etc.
      const projectTasksWithProjectDetails = (currentProjectData.tasks || []).map(task => ({
        ...task,
        project: {
          id: currentProjectData.id,
          title: currentProjectData.title, // AQUI ESTÁ A CHAVE
          description: currentProjectData.description,
          priority: currentProjectData.priority,
          status: currentProjectData.status,
        },
      }));

      setRawTasks(projectTasksWithProjectDetails);

      if (projectTasksWithProjectDetails.length > 0) {
        const completedTasks = projectTasksWithProjectDetails.filter(task => task.status === 'concluido').length;
        const calculatedProgress = Math.round((completedTasks / projectTasksWithProjectDetails.length) * 100);
        setProgress(calculatedProgress);
      } else {
        setProgress(0);
      }

    } catch (err) {
      console.error('Erro ao atualizar tarefas do projeto:', err);
      // Considerar setar um estado de erro aqui se apropriado
    }
  }, [projectId, project, queryClient]); // Adicionar 'project' como dependência

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
// Função para lidar com a mudança de equipe selecionada
  const handleTeamChange = useCallback((value: string) => {
    if (value === 'all') {
      setSelectedTeamId(null);
    } else {
      setSelectedTeamId(Number(value));
    }
  }, []);

  // Função para lidar com a mudança de usuário selecionado
  const handleUserChange = useCallback((value: string) => {
    if (value === 'all') {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(Number(value));
    }
  }, []);

  // Função para lidar com a mudança de modo de visualização
  const handleViewModeChange = useCallback((value: 'status' | 'date') => {
    setKanbanViewMode(value);
  }, []);

  // Função para lidar com o sucesso da edição do projeto
  const handleEditSuccess = useCallback(() => {
    setIsEditDialogOpen(false);
    // Recarregar os dados do projeto para refletir as alterações
    if (projectId) {
      const id = parseInt(projectId);
      queryClient.fetchQuery(getProjectQueryOptions(id)).then((projectData) => {
        const convertedProject = transformApiProjectToFrontend(projectData);
        setProject(convertedProject);

        // Usar as tarefas que já vêm incluídas no projeto
        const projectTasks = (projectData.tasks || []).map(task => ({
          ...task,
          project: {
            id: projectData.id,
            title: projectData.title,
            description: projectData.description,
            priority: projectData.priority,
            status: projectData.status,
          },
        }));
        setRawTasks(projectTasks);

        // Recalcular progresso com base nas tarefas concluídas
        if (projectTasks.length > 0) {
          const completedTasks = projectTasks.filter(task => task.status === 'concluido').length;
          const calculatedProgress = Math.round((completedTasks / projectTasks.length) * 100);
          setProgress(calculatedProgress);
        }

        // Atualizar usuários e equipes do projeto
        if (projectData.users && Array.isArray(projectData.users)) {
          const usersArray = projectData.users
            .map(user => typeof user === 'object' && user !== null ? user : null)
            .filter(user => user !== null);
          setProjectUsers(usersArray as User[]);
        }

        if (projectData.occupations && Array.isArray(projectData.occupations)) {
          const occupationsArray = projectData.occupations
            .map(occupation => typeof occupation === 'object' && occupation !== null ? occupation : null)
            .filter(occupation => occupation !== null);
          setProjectOccupations(occupationsArray as Team[]);
        }
      });
    }
  }, [projectId, queryClient]);

  // Função para lidar com a atualização de tarefas via API
  const handleUpdateTaskApi = useCallback(async (taskId: number, data: UpdateTaskRequest) => {
    try {
      await updateTaskMutation({ id: taskId, data });
    } catch (error) {
      console.error('Erro ao atualizar tarefa via API:', error);
      throw error; // Re-lança o erro para que o chamador possa lidar com ele
    }
  }, [updateTaskMutation]);

  // Função para lidar com mudança de status da tarefa no Kanban
  const handleKanbanTaskStatusChange = useCallback(async (task: any, newStatus: TaskStatus, newOrder?: number) => {
    try {
      const updateData: UpdateTaskRequest = { status: newStatus };
      if (newOrder !== undefined) {
        updateData.order = newOrder;
      }
      await updateTaskMutation({ id: task.id, data: updateData });
      // Recarregar as tarefas do projeto
      await updateProjectTasks();
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      toast.error('Erro ao atualizar status da tarefa');
    }
  }, [updateTaskMutation, updateProjectTasks]);

  // Função para lidar com atualizações genéricas de tarefa
  const handleGenericTaskUpdate = useCallback(async () => {
    await updateProjectTasks();
  }, [updateProjectTasks]);

  // Função para lidar com a remoção do projeto
  const handleDeleteProject = useCallback(async () => {
    if (!projectId) return;

    try {
      const id = parseInt(projectId);
      await deleteProjectMutation(id);
      toast.success('Projeto removido com sucesso!');
      setIsDeleteDialogOpen(false);
      // Navegar de volta para a lista de projetos
      navigate('/projects');
    } catch (error) {
      toast.error('Erro ao remover projeto. Tente novamente.');
    }
  }, [projectId, deleteProjectMutation, navigate]);

  // Efeito para forçar a atualização das estatísticas quando o componente é montado
  useEffect(() => {
    if (!isLoading && project) {
      updateProjectTasks();
    }
  }, [isLoading, project, updateProjectTasks]);

  // Efeito para forçar a atualização das estatísticas a cada 5 segundos
  useEffect(() => {
    if (!isLoading && project) {
      const interval = setInterval(() => {
        updateProjectTasks();
      }, 5000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoading, project, updateProjectTasks]);

  useEffect(() => {
    if (!projectData) return;

    setIsLoading(true);
    setError(null);

    const convertedProject = transformApiProjectToFrontend(projectData);
    setProject(convertedProject);

    const projectTasks = (projectData.tasks || []).map(task => ({
      ...task,
      project: {
        id: projectData.id,
        title: projectData.title,
        description: projectData.description,
        priority: projectData.priority,
        status: projectData.status,
      },
    }));
    setRawTasks(projectTasks);

    if (projectTasks.length > 0) {
      const completedTasks = projectTasks.filter(task => task.status === 'concluido').length;
      setProgress(Math.round((completedTasks / projectTasks.length) * 100));
    }

    if (projectData.users && Array.isArray(projectData.users)) {
      const usersArray = projectData.users.filter(u => typeof u === 'object') as User[];
      setProjectUsers(usersArray);
    }

    if (projectData.occupations && Array.isArray(projectData.occupations)) {
      const occupationsArray = projectData.occupations.filter(o => typeof o === 'object') as Team[];
      setProjectOccupations(occupationsArray);
    }

    setAllUsers(usersQueryData);
    setAllOccupations(occupationsQueryData);
    setIsLoading(false);
  }, [projectData, usersQueryData, occupationsQueryData]);

  // Efeito para atualizar os componentes KanbanBoard e TasksList quando o projectId mudar
  // ou quando os dados do projeto são carregados
  useEffect(() => {
    // Só executar quando o projeto estiver carregado e não estiver mais em loading
    if (project && !isLoading) {
      // Limpar seleções de filtro ao mudar de projeto
      // setSelectedTeamId(null); // Estes filtros agora são parte do objeto 'filters'
      // setSelectedUserId(null);

      // Não é mais necessário chamar fetchTasks diretamente no KanbanBoard ou TasksList
      // Eles reagirão às props rawTasks e filters.
      // A lógica de timeout pode ser removida ou repensada se ainda for necessária para algo.
    }
  }, [projectId, project, isLoading]); // Removidas as refs dos componentes filhos

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-10 w-64" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 col-span-2">
              <Skeleton className="h-7 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>

                {/* Skeleton para informações do projeto em uma única linha */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Skeleton para Data de Início */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>

                  {/* Skeleton para Data de Término */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>

                  {/* Skeleton para Equipes */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </div>

                  {/* Skeleton para Usuários */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-10" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <Skeleton className="h-7 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <Button
            variant="ghost"
            className="w-fit gap-2"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Projetos
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Projeto não encontrado. Verifique se o ID está correto.'}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }



  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate('/projects')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.title}
              </h1>
              <Badge variant={project.priority === 'urgente' ? "destructive" :
                     project.priority === 'alta' ? "destructive" :
                     project.priority === 'media' ? "default" : "secondary"}>
                Prioridade {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
              </Badge>
              <Badge variant={project.status ? "default" : "secondary"}>
                {project.status ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            {!permissions.isMember && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2">
            <h2 className="text-lg font-medium mb-4">Informações do Projeto</h2>
            {project.description && (
              <div className="text-muted-foreground mb-4 prose dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_br]:block [&_br]:mb-2 [&_p:empty]:h-6 [&_p:empty]:block" dangerouslySetInnerHTML={{ __html: project.description }} />
            )}

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Progresso Geral</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Concluídas: {rawTasks.filter(t => t.status === 'concluido').length} de {rawTasks.length}</span>
                  <span>Em andamento: {rawTasks.filter(t => ['em_andamento', 'em_revisao'].includes(t.status)).length}</span>
                </div>
              </div>

              {/* Informações do projeto em uma única linha: datas, equipes, usuários */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Datas */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Data de Início</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(project.start_date || project.startDate)}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Data de Término</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(project.end_date || project.endDate)}
                  </div>
                </div>

                {/* Equipes do Projeto */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Equipes do Projeto</h3>
                  {projectOccupations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {projectOccupations.map((occupation) => (
                        <Badge key={occupation.id} variant="outline" className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          {occupation.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma equipe atribuída</p>
                  )}
                </div>

                {/* Usuários do Projeto */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Usuários do Projeto</h3>
                  {projectUsers.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {/* Mostrar apenas os dois primeiros usuários */}
                      <div className="flex -space-x-2">
                        {projectUsers.slice(0, 2).map((user) => (
                          <Avatar key={user.id} className="border-2 border-background h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>

                      {/* Se houver mais de 2 usuários, mostrar um popover com todos */}
                      {projectUsers.length > 2 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                              +{projectUsers.length - 2}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-2">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Todos os usuários</h4>
                              <div className="space-y-1">
                                {projectUsers.map((user) => (
                                  <div key={user.id} className="flex items-center gap-2 p-1 rounded-md hover:bg-accent">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{user.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum usuário atribuído</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Estatísticas</h2>
              <div className="text-xs text-muted-foreground">
                Atualizado em: {formatDate(project.updated_at || project.updatedAt)}
              </div>
            </div>
            <div className="space-y-6">
              {/* Resumo de Tarefas */}
              <div>
                <h3 className="text-sm font-medium mb-3">Tarefas</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-accent/20 rounded-lg p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-xl font-bold">{rawTasks.length}</p>
                  </div>
                  <div className="bg-accent/20 rounded-lg p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Atrasadas</p>
                    <p className="text-xl font-bold text-red-500">
                      {(() => {
                        const atrasadas = rawTasks.filter(t => {
                          if (!t.due_date) return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = new Date(t.due_date);
                          return dueDate < today && t.status !== 'concluido';
                        });
                        return atrasadas.length;
                      })()}
                    </p>
                  </div>
                  <div className="bg-accent/20 rounded-lg p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Concluídas</p>
                    <p className="text-xl font-bold">{rawTasks.filter(t => t.status === 'concluido').length}</p>
                  </div>
                </div>
              </div>

              {/* Status das Tarefas */}
              <div>
                <h3 className="text-sm font-medium mb-3">Status das Tarefas</h3>
                <div className="space-y-2">
                  {/* Status com barras de progresso */}
                  <div className="grid grid-cols-[1fr,auto] gap-x-4 gap-y-2 items-center">
                    {/* Pendente */}
                    <span className="text-sm text-muted-foreground">Pendente:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'pendente').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'pendente').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* A Fazer */}
                    <span className="text-sm text-muted-foreground">A Fazer:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'a_fazer').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'a_fazer').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* Em Andamento */}
                    <span className="text-sm text-muted-foreground">Em Andamento:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'em_andamento').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'em_andamento').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* Em Revisão */}
                    <span className="text-sm text-muted-foreground">Em Revisão:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'em_revisao').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'em_revisao').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* Concluído */}
                    <span className="text-sm text-muted-foreground">Concluído:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'concluido').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'concluido').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </Card>
        </div>

        <Card>
          <Tabs defaultValue="kanban" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="list">Lista</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Select
                  value={priorityFilter}
                  onValueChange={(value) => setPriorityFilter(value as ProjectPriority | 'todos')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Prioridades</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedTeamId ? String(selectedTeamId) : 'all'}
                  onValueChange={handleTeamChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    {projectOccupations
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Seletor de usuário responsável */}
                <Select
                  value={selectedUserId ? String(selectedUserId) : 'all'}
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os responsáveis</SelectItem>
                    {projectUsers
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Seletor de modo de visualização do Kanban */}
                <Select
                  value={kanbanViewMode}
                  onValueChange={handleViewModeChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Modo de visualização" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Por Status</SelectItem>
                    <SelectItem value="date">Por Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value="kanban" className="mt-6 pb-0">
              <div className="overflow-x-auto pb-0 mb-0">
                <div className="px-5" style={{ minWidth: 'calc(280px * 7 + 1rem * 6 + 2.5rem)' }}>
                  {isLoading && !rawTasks.length ? (
                    <Skeleton className="w-full h-[500px]" />
                  ) : (
                    <KanbanBoard
                      rawTasks={rawTasks}
                      boardMode="project-view"
                      viewMode={kanbanViewMode}
                      filters={{
                        priority: priorityFilter === 'todos' ? null : priorityFilter,
                        teamId: selectedTeamId,
                        userId: selectedUserId,
                        // No ProjectView, geralmente mostramos todas as tarefas (concluídas ou não)
                        // a menos que haja um switch específico para isso nesta página.
                        // Por ora, vamos assumir que sempre mostra concluídas.
                        showCompleted: true,
                      }}
                      projectId={projectId} // Passar o projectId string
                      project={project} // Passar o objeto do projeto se o KanbanBoard ainda o utiliza
                      onUpdateTaskApi={handleUpdateTaskApi} // Passar a função de atualização da API
                      onTaskStatusChange={handleKanbanTaskStatusChange} // Adicionar handler de mudança de status
                      onGenericTaskUpdate={handleGenericTaskUpdate} // Adicionar handler de atualização genérica
                    />
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="list" className="mt-6">
              <div className="px-5">
                {/* TasksList também precisará ser refatorado para usar rawTasks e filters */}
                <TasksList
                  ref={tasksListRef}
                  projectId={parseInt(projectId || '0')} // Manter por compatibilidade
                  teams={projectOccupations} // Manter por compatibilidade
                  selectedTeamId={selectedTeamId} // Manter por compatibilidade
                  selectedUserId={selectedUserId} // Manter por compatibilidade
                  priorityFilter={priorityFilter === 'todos' ? undefined : priorityFilter} // Manter por compatibilidade
                  viewMode={kanbanViewMode} // Manter por compatibilidade
                  onTasksUpdated={updateProjectTasks} // Manter por compatibilidade
                  forceUserFilter={false} // Manter por compatibilidade
                  // showCompleted={true} // Adicionar se TasksList tiver essa prop
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Diálogo de edição do projeto */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>
                Edite os detalhes do projeto. Clique em salvar quando terminar.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {project && (
                <>
                  <ProjectForm
                    projectId={parseInt(projectId || '0')}
                    initialData={project}
                    onSuccess={handleEditSuccess}
                    onDelete={() => {
                      setIsEditDialogOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                  />


                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmação para remoção de projeto */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o projeto "{project?.title}"?
                Esta ação não pode ser desfeita e todas as tarefas associadas a este projeto serão removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ProjectView;
