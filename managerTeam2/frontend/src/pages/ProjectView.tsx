
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Calendar, Users, ChevronDown, Building2, Edit } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { projectService, Project } from '@/lib/api';
import { convertApiProjectToFrontend } from '@/lib/api/projects';
import { taskService, userService, teamService, User, Team } from '@/lib/api';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { TasksList } from '@/components/dashboard/TasksList';

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [kanbanViewMode, setKanbanViewMode] = useState<'status' | 'date'>('status');
  const [projectUsers, setProjectUsers] = useState<User[]>([]);
  const [projectTeams, setProjectTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const tasksListRef = React.useRef<{ fetchTasks: () => Promise<void> }>(null);

  // Referência para o componente KanbanBoard
  const kanbanBoardRef = React.useRef<{ fetchTasks: () => Promise<void> }>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      setIsLoading(true);
      setError(null);
      console.log(`Carregando dados do projeto ID: ${projectId}`);

      try {
        // Converter projectId para número
        const id = parseInt(projectId);

        // Carregar projeto da API
        const projectData = await projectService.getProject(id);
        // Garantir que os dados do projeto estejam no formato correto
        const convertedProject = convertApiProjectToFrontend(projectData);
        setProject(convertedProject);

        // Carregar tarefas do projeto
        const projectTasks = await taskService.getTasksByProject(id);
        console.log(`Tarefas carregadas para o projeto ${id}:`, projectTasks.length);
        setTasks(projectTasks);

        // Calcular progresso com base nas tarefas concluídas
        if (projectTasks.length > 0) {
          const completedTasks = projectTasks.filter(task => task.status === 'concluido').length;
          const calculatedProgress = Math.round((completedTasks / projectTasks.length) * 100);
          setProgress(calculatedProgress);
        }

        // Usar diretamente os usuários e equipes do projeto retornados pela API
        console.log('Dados do projeto:', projectData);

        // Verificar se o projeto tem usuários e equipes
        if (projectData.users && Array.isArray(projectData.users)) {
          // Verificar se os usuários são objetos completos ou apenas IDs
          const usersArray = projectData.users.map(user => {
            if (typeof user === 'object' && user !== null) {
              return user; // Já é um objeto de usuário completo
            }
            return null; // Não podemos processar apenas IDs aqui
          }).filter(user => user !== null);

          console.log('Usuários do projeto:', usersArray);
          setProjectUsers(usersArray as User[]);
        }

        if (projectData.occupations && Array.isArray(projectData.occupations)) {
          // Verificar se as equipes são objetos completos ou apenas IDs
          const teamsArray = projectData.occupations.map(team => {
            if (typeof team === 'object' && team !== null) {
              return team; // Já é um objeto de equipe completo
            }
            return null; // Não podemos processar apenas IDs aqui
          }).filter(team => team !== null);

          console.log('Equipes do projeto:', teamsArray);
          setProjectTeams(teamsArray as Team[]);
        }

        // Carregar todos os usuários e equipes para referência
        const [usersData, teamsData] = await Promise.all([
          userService.getUsers(),
          teamService.getTeams()
        ]);

        setAllUsers(usersData);
        setAllTeams(teamsData);
      } catch (err) {
        console.error('Erro ao carregar dados do projeto:', err);
        setError('Não foi possível carregar os dados do projeto. Tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  // Efeito para atualizar os componentes KanbanBoard e TasksList quando o projectId mudar
  useEffect(() => {
    // Pequeno atraso para garantir que os componentes estejam montados
    const timer = setTimeout(() => {
      if (kanbanBoardRef.current) {
        console.log('Atualizando KanbanBoard para o projeto:', projectId);
        kanbanBoardRef.current.fetchTasks();
      }

      if (tasksListRef.current) {
        console.log('Atualizando TasksList para o projeto:', projectId);
        tasksListRef.current.fetchTasks();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId]);

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

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para lidar com a mudança de equipe selecionada
  const handleTeamChange = (value: string) => {
    if (value === 'all') {
      setSelectedTeamId(null);
    } else {
      setSelectedTeamId(Number(value));
    }
  };

  // Função para lidar com a mudança de usuário selecionado
  const handleUserChange = (value: string) => {
    if (value === 'all') {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(Number(value));
    }
  };

  // Função para lidar com o sucesso da edição do projeto
  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    // Recarregar os dados do projeto para refletir as alterações
    if (projectId) {
      const id = parseInt(projectId);
      projectService.getProject(id).then(projectData => {
        const convertedProject = convertApiProjectToFrontend(projectData);
        setProject(convertedProject);

        // Atualizar usuários e equipes do projeto
        if (projectData.users && Array.isArray(projectData.users)) {
          const usersArray = projectData.users
            .map(user => typeof user === 'object' && user !== null ? user : null)
            .filter(user => user !== null);
          setProjectUsers(usersArray as User[]);
        }

        if (projectData.occupations && Array.isArray(projectData.occupations)) {
          const teamsArray = projectData.occupations
            .map(team => typeof team === 'object' && team !== null ? team : null)
            .filter(team => team !== null);
          setProjectTeams(teamsArray as Team[]);
        }
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
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
              {project.title}
            </h1>
            <Button
              variant="outline"
              size="sm"
              className="ml-2 gap-1"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={project.priority === 'urgente' ? "destructive" :
                   project.priority === 'alta' ? "destructive" :
                   project.priority === 'media' ? "default" : "secondary"}>
              Prioridade {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
            </Badge>
            <Badge variant={project.status ? "default" : "secondary"}>
              {project.status ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2">
            <h2 className="text-lg font-medium mb-4">Informações do Projeto</h2>
            {project.description && (
              <p className="text-muted-foreground mb-4">{project.description}</p>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Progresso</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
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
                  {projectTeams.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {projectTeams.map((team) => (
                        <Badge key={team.id} variant="outline" className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          {team.name}
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
            <h2 className="text-lg font-medium mb-4">Estatísticas</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Tarefas</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-accent/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{tasks.length}</p>
                  </div>
                  <div className="bg-accent/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                    <p className="text-xl font-bold">{tasks.filter(t => t.status === 'concluido').length}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Datas</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Criado em:</span>
                    <span className="text-sm">{formatDate(project.created_at || project.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Última atualização:</span>
                    <span className="text-sm">{formatDate(project.updated_at || project.updatedAt)}</span>
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
                  value={selectedTeamId ? String(selectedTeamId) : 'all'}
                  onValueChange={handleTeamChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    {projectTeams.map((team) => (
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
                    {projectUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Seletor de modo de visualização do Kanban */}
                <Select
                  value={kanbanViewMode}
                  onValueChange={(value: 'status' | 'date') => setKanbanViewMode(value)}
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
            <TabsContent value="kanban" className="mt-6">
              <div className="px-5">
                <KanbanBoard
                  ref={kanbanBoardRef}
                  projectId={parseInt(projectId || '0')}
                  teams={projectTeams}
                  selectedTeamId={selectedTeamId}
                  onTeamChange={setSelectedTeamId}
                  selectedUserId={selectedUserId}
                  onUserChange={setSelectedUserId}
                  viewMode={kanbanViewMode}
                  onViewModeChange={setKanbanViewMode}
                />
              </div>
            </TabsContent>
            <TabsContent value="list" className="mt-6">
              <div className="px-5">
                {console.log('Passando viewMode para TasksList:', kanbanViewMode)}
                <TasksList
                  ref={tasksListRef}
                  projectId={parseInt(projectId || '0')}
                  teams={projectTeams}
                  selectedTeamId={selectedTeamId}
                  selectedUserId={selectedUserId}
                  viewMode={kanbanViewMode}
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
                <ProjectForm
                  projectId={parseInt(projectId || '0')}
                  initialData={project}
                  onSuccess={handleEditSuccess}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ProjectView;
