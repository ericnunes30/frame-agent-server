import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, MoreHorizontal, Users, Calendar, ArrowRight, ClipboardList, AlertCircle, Edit, Pencil, Trash2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectForm } from '@/components/forms/ProjectForm';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Project, ProjectPriority, Task } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from "@/components/ui/switch"; // Importar o componente Switch

// Estendendo a interface Project para incluir campos adicionais usados na UI
interface UIProject extends Project {
  name?: string;
  client?: string;
  createdAt?: string;
  teamId?: number;
  members?: number[];
  statusText?: string; // Propriedade para armazenar o status como texto
}


const Projects = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState<UIProject | null>(null);
  const [isViewProjectOpen, setIsViewProjectOpen] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Record<number, number>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<UIProject | null>(null);
  // Declaração do estado de tarefas dos projetos
  const [projectTasksData, setProjectTasksData] = useState<Record<number, any[]>>({});
  const { user } = useAuth();
  const permissions = usePermissions();
  const { projects: projectsService } = useBackendServices();
  const queryClient = useQueryClient();
  const [viewProjectId, setViewProjectId] = useState<number | null>(null);
  const { data: viewProjectData } = projectsService.useGetProject(viewProjectId as number, Boolean(viewProjectId));
  const { mutateAsync: deleteProjectMutation } = projectsService.useDeleteProject();

  const { data, isLoading, isError } = projectsService.useGetProjects();
  const projects = data ?? [];
  const [searchTerm, setSearchTerm] = useState(''); // Adicionar estado para o termo de busca
  const [showInactiveProjects, setShowInactiveProjects] = useState(false); // Adicionar estado para o filtro de projetos inativos
  const [refreshing, setRefreshing] = useState(false);

  // Efeito para verificar o estado das tarefas após o carregamento
  useEffect(() => {
    // Só executar quando os projetos estiverem carregados e não estiver mais em loading
    if (!isLoading && projects.length > 0) {

      // Verificar o estado atual das tarefas
      const projectTasksKeys = Object.keys(projectTasksData);

      if (projectTasksKeys.length > 0) {
        projectTasksKeys.forEach(key => {
          const projectId = Number(key);
          const tasks = projectTasksData[projectId] || [];
        });
      }

      // Verificar se todos os projetos têm tarefas carregadas
      const projectsWithoutTasks = projects.filter(p => {
        if (!p.id) return false;
        return !projectTasksData[p.id] || projectTasksData[p.id].length === 0;
      });

      // Se houver projetos sem tarefas, usar as tarefas aninhadas dos projetos
      if (projectsWithoutTasks.length > 0) {

        // Processar as tarefas aninhadas para cada projeto sem tarefas
        projectsWithoutTasks.forEach(project => {
          if (project.id) {

            // Verificar se o projeto tem tarefas aninhadas
            const projectTasks = project.tasks || [];

            if (projectTasks.length > 0) {

              // Criar uma cópia profunda das tarefas para evitar compartilhamento de referência
              const tasksCopy = JSON.parse(JSON.stringify(projectTasks));

              // Verificar se cada tarefa tem um ID de projeto válido
              tasksCopy.forEach(task => {
                if (!task.project_id && !task.projectId) {
                  task.project_id = project.id;
                }
              });

              // Atualizar o cache de tarefas com uma cópia dos dados
              setProjectTasksData(prev => {
                const newData = { ...prev };
                newData[project.id] = tasksCopy;


                return newData;
              });
            } else {
              // Se o projeto não tiver tarefas aninhadas, tentar carregar as tarefas da API
              // Usar setTimeout para evitar problemas de concorrência
              setTimeout(() => {
                refreshProjectTasks(project.id);
              }, 100);
            }
          }
        });
      }
    }
  }, [isLoading, projects]);

  const handleAddProject = async () => {
    // Fechar o diálogo e recarregar os projetos
    setIsDialogOpen(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: projectsService.getProjectsQueryKey() });
    setRefreshing(false);
  };

  const handleEditProject = async () => {
    // Fechar o diálogo de edição e recarregar os projetos
    setIsEditDialogOpen(false);
    setSelectedProject(null);
  };

  const editProject = (project: UIProject) => {
    // Verificar se o usuário é um membro e se tem permissão para editar este projeto
    if (permissions.isMember) {
      // Membros não podem editar projetos, apenas visualizar
      console.error('Usuários com nível de Membro não podem editar projetos');
      toast.error('Você não tem permissão para editar projetos');
      return;
    }

    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  const deleteProject = (project: UIProject) => {
    // Verificar se o usuário é um membro e se tem permissão para excluir este projeto
    if (permissions.isMember) {
      // Membros não podem excluir projetos, apenas visualizar
      console.error('Usuários com nível de Membro não podem excluir projetos');
      toast.error('Você não tem permissão para excluir projetos');
      return;
    }

    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProjectMutation(projectToDelete.id);
      toast.success('Projeto removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Erro ao remover projeto:', error);
      toast.error('Erro ao remover projeto. Tente novamente.');
    }
  };

  const viewProject = (project: UIProject) => {
    try {
      // Verificar se o usuário é um membro e se tem permissão para visualizar este projeto
      if (permissions.isMember) {
        // Tentar obter o ID do usuário do contexto de autenticação primeiro
        let userId = user?.id;

        // Se não tiver o ID do usuário no contexto, tentar obter do localStorage
        if (!userId) {
          const userData = localStorage.getItem('user');
          if (userData) {
            try {
              const parsedUser = JSON.parse(userData);
              userId = parsedUser.id;
            } catch (e) {
              console.error('Erro ao obter ID do usuário do localStorage:', e);
            }
          }
        }

        // Verificar se o usuário está na lista de usuários do projeto
        if (userId) {
          const userInProject = project.users?.some(projectUser =>
            (typeof projectUser === 'number' && projectUser === userId) ||
            (typeof projectUser === 'object' && projectUser !== null && projectUser.id === userId)
          );

          if (!userInProject) {
            console.error(`Usuário ${userId} não tem permissão para visualizar o projeto ${project.id}`);
            toast.error('Você não tem permissão para visualizar este projeto');
            return;
          }
        }
      }

      setViewProjectId(project.id);
    } catch (err) {
      console.error(`Erro ao verificar permissões para o projeto ${project.id}:`, err);
      const projectCopy = { ...project } as UIProject;
      if (typeof projectCopy.status === 'boolean') {
        projectCopy.statusText = projectCopy.status ? 'Ativo' : 'Inativo';
      }
      if (projectCopy.users && Array.isArray(projectCopy.users)) {
        projectCopy.members = projectCopy.users.map(user =>
          typeof user === 'object' ? user.id : user
        );
      }
      setSelectedProject(projectCopy);
      setIsViewProjectOpen(true);
    }
  };

  useEffect(() => {
    if (viewProjectData && viewProjectId !== null) {
      const projectCopy = { ...viewProjectData } as UIProject;
      if (typeof projectCopy.status === 'boolean') {
        projectCopy.statusText = projectCopy.status ? 'Ativo' : 'Inativo';
      }
      if (projectCopy.users && Array.isArray(projectCopy.users)) {
        projectCopy.members = projectCopy.users.map(user =>
          typeof user === 'object' ? user.id : user
        );
      } else {
        projectCopy.members = [];
      }
      setSelectedProject(projectCopy);
      if (viewProjectId) {
        refreshProjectTasks(viewProjectId);
      }
      setIsViewProjectOpen(true);
    }
  }, [viewProjectData]);

  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Sem equipe';
  };

  const getProjectMembers = (memberIds: number[] = []) => {
    if (!memberIds || memberIds.length === 0) return [];

    // Log para debug

    return users.filter(user => memberIds.includes(user.id));
  };

  // Obter tarefas de um projeto
  const getProjectTasks = (projectId: number) => {
    // Verificar se o ID do projeto é válido
    if (!projectId) {
      console.error('ID de projeto inválido:', projectId);
      return [];
    }

    // Garantir que estamos retornando uma cópia dos dados para evitar compartilhamento de referência
    const tasks = projectTasksData[projectId] || [];
    

    return [...tasks];
  };

  // Calcular progresso de um projeto com base em suas tarefas
  const calculateProjectProgress = (projectId: number) => {
    // Verificar se o ID do projeto é válido
    if (!projectId) {
      console.error('ID de projeto inválido para cálculo de progresso:', projectId);
      return 0;
    }

    const tasks = getProjectTasks(projectId);
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    const completedTasks = tasks.filter(task => task.status === 'concluido').length;
    const progress = Math.round((completedTasks / tasks.length) * 100);

    return progress;
  };




  // Função para forçar a atualização dos dados das tarefas de um projeto específico
  const refreshProjectTasks = async (projectId: number) => {
    if (!projectId) {
      console.error('ID de projeto inválido para atualização de tarefas:', projectId);
      return [];
    }

    try {
      // Buscar o projeto atualizado da API usando React Query
      const project: Project = await queryClient.fetchQuery(
        projectsService.getProjectQueryOptions(projectId)
      );

      if (!project) {
        console.error(`Projeto ${projectId} não encontrado`);
        return [];
      }

      // Verificar se o projeto tem tarefas
      const projectTasks = project.tasks || [];

      // Criar uma cópia profunda das tarefas para evitar compartilhamento de referência
      const tasksCopy = JSON.parse(JSON.stringify(projectTasks));

      // Verificar se cada tarefa tem um ID de projeto válido
      tasksCopy.forEach(task => {
        if (!task.project_id && !task.projectId) {
          task.project_id = projectId;
        }
      });

      // Atualizar o cache de tarefas com uma cópia dos dados
      setProjectTasksData(prev => {
        const newData = { ...prev };
        newData[projectId] = tasksCopy;
        return newData;
      });

      return tasksCopy;
    } catch (err) {
      console.error(`Erro ao atualizar tarefas do projeto ${projectId}:`, err);
      return [];
    }
  };

  const navigateToProject = (projectId: number) => {
    // Verificar se o usuário é um membro e se tem permissão para navegar para este projeto
    if (permissions.isMember) {
      // Tentar obter o ID do usuário do contexto de autenticação primeiro
      let userId = user?.id;

      // Se não tiver o ID do usuário no contexto, tentar obter do localStorage
      if (!userId) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            userId = parsedUser.id;
          } catch (e) {
            console.error('Erro ao obter ID do usuário do localStorage:', e);
          }
        }
      }

      // Verificar se o usuário está na lista de usuários do projeto
      if (userId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          const userInProject = project.users?.some(projectUser =>
            (typeof projectUser === 'number' && projectUser === userId) ||
            (typeof projectUser === 'object' && projectUser !== null && projectUser.id === userId)
          );

          if (!userInProject) {
            console.error(`Usuário ${userId} não tem permissão para navegar para o projeto ${projectId}`);
            toast.error('Você não tem permissão para acessar este projeto');
            return;
          }
        }
      }
    }

    navigate(`/projects/${projectId}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
            <p className="text-muted-foreground">
              Gerencie seus projetos e acompanhe o progresso.
            </p>
            <Input
              type="text"
              placeholder="Buscar projetos..."
              className="mt-4 max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-inactive-projects">Mostrar Projetos Inativos</Label>
              <Switch
                id="show-inactive-projects"
                checked={showInactiveProjects}
                onCheckedChange={setShowInactiveProjects}
              />
            </div>
            {!permissions.isMember ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Novo Projeto
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Projeto</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes do projeto. Clique em salvar quando terminar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <ProjectForm onSuccess={handleAddProject} />
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erro ao carregar projetos.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Esqueletos de carregamento
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-40 mb-2" />

                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <div className="flex -space-x-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>

                  <div className="border-t p-4 bg-muted/50">
                    <Skeleton className="h-9 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : projects.length > 0 ? (
            projects
            .filter((project) => {
              const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    project.description.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesInactiveFilter = showInactiveProjects ? !project.status : project.status; // Se showInactiveProjects for true, mostra apenas inativos; caso contrário, só mostra projetos ativos
              return matchesSearch && matchesInactiveFilter;
            })
            .sort((a, b) => a.title.localeCompare(b.title)) // Ordenar por título alfabeticamente
            .map((project) => {
              // Obter membros do projeto (usando a propriedade users da API)
              const members = getProjectMembers((project as UIProject).members || project.users?.map(u => typeof u === 'object' ? u.id : u) || []);

              // Obter tarefas do projeto (já retorna uma cópia para evitar compartilhamento de referência)
              const projectTasksList = getProjectTasks(project.id);

              // Calcular progresso usando a função dedicada
              const progress = calculateProjectProgress(project.id);

              // Contagem de tarefas para este projeto específico
              const taskCount = projectTasksList.length;

              // Log para debug com informações detalhadas

              return (
                <Card
                  key={project.id}
                  className="overflow-hidden hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative group"
                  onClick={() => navigateToProject(project.id)}
                >
                  <CardContent className="p-0">
                    {/* Indicador visual de que o card é clicável */}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-lg">{project.title}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()} // Evita que o clique propague para o card
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation(); // Evita que o clique propague para o card
                              viewProject(project);
                            }}>
                              Ver Detalhes
                            </DropdownMenuItem>
                            {!permissions.isMember && (
                              <>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation(); // Evita que o clique propague para o card
                                  editProject(project);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar Projeto
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation(); // Evita que o clique propague para o card
                                    deleteProject(project);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover Projeto
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description || 'Sem descrição.' }} />

                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progresso</span>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <Progress
                          value={progress}
                          className="h-1.5"
                          key={`progress-${project.id}-${taskCount}-${progress}`}
                        />
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <Badge variant={
                          project.priority === 'urgente' ? 'destructive' :
                          project.priority === 'alta' ? 'outline' :
                          project.priority === 'media' ? 'secondary' : 'default'
                        }>
                          {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                        </Badge>
                        <Badge variant={project.status ? "default" : "secondary"}>
                          {project.status ? "Ativo" : "Inativo"}
                        </Badge>

                        <div className="flex -space-x-2">
                          {members.slice(0, 3).map((member, idx) => (
                            <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {member.name ? member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'UN'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {members.length > 3 && (
                            <Avatar className="h-6 w-6 border-2 border-background bg-muted">
                              <AvatarFallback className="text-xs">
                                +{members.length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {project.start_date 
                              ? new Date(project.start_date).toLocaleDateString('pt-BR')
                              : 'N/D'} - {project.end_date 
                                ? new Date(project.end_date).toLocaleDateString('pt-BR')
                                : 'N/D'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-1" />
                          <span>{taskCount} tarefas</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full border rounded-lg p-6">
              <p className="text-center text-muted-foreground">Nenhum projeto encontrado. Crie seu primeiro projeto!</p>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de edição de projeto */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>
              Edite os detalhes do projeto. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedProject && (
              <>
                <ProjectForm
                  projectId={selectedProject.id}
                  initialData={selectedProject}
                  onSuccess={handleEditProject}
                  onDelete={() => {
                    setIsEditDialogOpen(false);
                    deleteProject(selectedProject);
                  }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de visualização de projeto */}
      <Dialog open={isViewProjectOpen} onOpenChange={setIsViewProjectOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProject.name || selectedProject.title}</DialogTitle>
                <DialogDescription>
                  Cliente: {selectedProject.client || 'Não especificado'}

                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-6">
                {/* Cabeçalho com informações principais */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="flex items-center gap-2 mr-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Status</span>
                          <Badge
                            variant={
                              selectedProject.statusText === "Ativo" ? "default" :
                              selectedProject.statusText === "Concluído" ? "default" :
                              typeof selectedProject.status === 'boolean'
                                ? (selectedProject.status ? "default" : "secondary")
                                : "secondary"
                            }
                            className="px-3 py-1">
                            {selectedProject.statusText ||
                             (typeof selectedProject.status === 'boolean'
                              ? (selectedProject.status ? "Ativo" : "Inativo")
                              : "Pendente")}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-10 w-px bg-border mx-1 hidden sm:block"></div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">Data de criação</span>
                        <span className="text-sm font-medium">
                          {new Date(selectedProject.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="w-full">
                      {/* Calculamos o progresso usando a função dedicada */}
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progresso</span>
                        <span className="text-xs font-medium">
                          {calculateProjectProgress(selectedProject.id)}%
                        </span>
                      </div>
                      <Progress
                        value={calculateProjectProgress(selectedProject.id)}
                        className="h-2"
                        key={`progress-dialog-${selectedProject.id}-${getProjectTasks(selectedProject.id).length}-${calculateProjectProgress(selectedProject.id)}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Descrição do projeto */}
                {selectedProject.description && (
                  <div className="border border-border/60 bg-muted/20 p-4 rounded-md shadow-sm">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2 text-muted-foreground" />
                      Descrição
                    </h4>
                    <div className="text-sm leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedProject.description }} />
                  </div>
                )}

                {/* Equipes */}
                <div className="border border-border/60 bg-muted/10 p-4 rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    Equipes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.occupations && selectedProject.occupations.length > 0 ? (

                      selectedProject.occupations.map((occupation) => {

                        // Verificar se occupation é um objeto ou um ID
                        const occupationId = typeof occupation === 'object' && occupation !== null ? occupation.id : occupation;
                        const occupationName = typeof occupation === 'object' && occupation !== null ? occupation.name : null;

                        // Se occupation for um objeto com name, usar diretamente
                        // Senão, tentar encontrar o nome da equipe no array de teams
                        const team = !occupationName ? teams.find(t => t.id === occupationId) : null;

                        return (
                          <Badge key={String(occupationId)} variant="secondary" className="px-3 py-1">
                            {occupationName || (team ? team.name : `Equipe ${occupationId}`)}
                          </Badge>
                        );
                      })
                    ) : selectedProject.teamId ? (
                      <Badge variant="secondary" className="px-3 py-1">
                        {getTeamName(selectedProject.teamId)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhuma equipe associada</span>
                    )}
                  </div>
                </div>

                {/* Membros e Tarefas em duas colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Membros do Projeto */}
                  <div className="border border-border/60 bg-muted/10 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        Membros do Projeto
                      </h4>
                      {/* Usar members se disponível, caso contrário, extrair IDs de users */}
                      {(() => {
                        const memberIds = selectedProject.members ||
                          (selectedProject.users && Array.isArray(selectedProject.users)
                            ? selectedProject.users.map(u => typeof u === 'object' ? u.id : u)
                            : []);

                        const members = getProjectMembers(memberIds);

                        return members.length > 4 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigateToProject(selectedProject.id)}
                          >
                            Ver Todos
                          </Button>
                        );
                      })()}
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        const memberIds = selectedProject.members ||
                          (selectedProject.users && Array.isArray(selectedProject.users)
                            ? selectedProject.users.map(u => typeof u === 'object' ? u.id : u)
                            : []);

                        const members = getProjectMembers(memberIds);

                        return members.length > 0 ? (
                          members.slice(0, 4).map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 border border-border/40 bg-background rounded-md hover:bg-muted/20 transition-colors">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarFallback>
                                    {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">{member.role === 'admin' ? 'Admin' : member.role === 'manager' ? 'Gerente' : 'Usuário'}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum membro adicionado a este projeto.</p>
                        );
                      })()}
                      {(() => {
                        const memberIds = selectedProject.members ||
                          (selectedProject.users && Array.isArray(selectedProject.users)
                            ? selectedProject.users.map(u => typeof u === 'object' ? u.id : u)
                            : []);

                        const members = getProjectMembers(memberIds);

                        return members.length > 4 && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            + {members.length - 4} outros membros
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Tarefas do Projeto */}
                  <div className="border border-border/60 bg-muted/10 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium flex items-center">
                        <ClipboardList className="h-4 w-4 mr-2 text-muted-foreground" />
                        Tarefas do Projeto
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => navigateToProject(selectedProject.id)}
                      >
                        Ver Todas
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {getProjectTasks(selectedProject.id).length > 0 ? (
                        getProjectTasks(selectedProject.id).slice(0, 4).map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-2 border border-border/40 bg-background rounded-md hover:bg-muted/20 transition-colors">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                task.priority === 'high' ? 'bg-destructive' :
                                task.priority === 'medium' ? 'bg-amber-500' :
                                'bg-secondary'
                              }`} />
                              <p className="text-sm font-medium truncate max-w-[180px]">{task.title}</p>
                            </div>
                            <Badge variant={
                              task.status === 'completed' ? 'default' :
                              task.status === 'in-progress' ? 'secondary' :
                              'outline'
                            }>
                              {task.status === 'completed' ? 'Concluída' :
                               task.status === 'in-progress' ? 'Em Andamento' :
                               'Pendente'}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma tarefa adicionada a este projeto.</p>
                      )}
                      {getProjectTasks(selectedProject.id).length > 4 && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          + {getProjectTasks(selectedProject.id).length - 4} tarefas não exibidas
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2">
                {!permissions.isMember && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mr-auto"
                    onClick={() => {
                      setIsViewProjectOpen(false);
                      deleteProject(selectedProject);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => navigateToProject(selectedProject.id)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Abrir Projeto
                </Button>

                {!permissions.isMember && (
                  <Button
                    onClick={() => {
                      // Fechar o popup de visualização
                      setIsViewProjectOpen(false);

                      // Garantir que estamos usando o projeto original (não a cópia com status convertido)
                      if (selectedProject && selectedProject.id) {
                        // Encontrar o projeto original pelo ID
                        const originalProject = projects.find(p => p.id === selectedProject.id);
                        if (originalProject) {
                          // Chamar a função editProject com o projeto original
                          editProject(originalProject);
                        } else {
                          // Usar o projeto selecionado como fallback
                          setIsEditDialogOpen(true);
                        }
                      } else {
                        // Fallback se não houver projeto selecionado
                        setIsEditDialogOpen(true);
                      }
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Projeto
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para remoção de projeto */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o projeto "{projectToDelete?.title}"?
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
    </AppLayout>
  );
};

export default Projects;
