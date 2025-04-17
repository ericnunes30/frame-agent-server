import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Users, Calendar, ArrowRight, ClipboardList, AlertCircle, Edit, Pencil } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectForm } from '@/components/forms/ProjectForm';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { projectService, Project, ProjectPriority } from '@/lib/api';

// Estendendo a interface Project para incluir campos adicionais usados na UI
interface UIProject extends Project {
  name?: string;
  client?: string;
  createdAt?: string;
  teamId?: number;
  members?: number[];
  statusText?: string; // Propriedade para armazenar o status como texto
}
import { taskService } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Projects = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState<UIProject | null>(null);
  const [isViewProjectOpen, setIsViewProjectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectTasks, setProjectTasks] = useState<Record<number, number>>({});

  // Função para carregar projetos da API
  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Carregar projetos da API
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);

      // Carregar contagem de tarefas para cada projeto
      const taskCounts: Record<number, number> = {};
      for (const project of projectsData) {
        try {
          const tasks = await taskService.getTasksByProject(project.id);
          taskCounts[project.id] = tasks.length;
        } catch (err) {
          console.error(`Erro ao carregar tarefas do projeto ${project.id}:`, err);
          taskCounts[project.id] = 0;
        }
      }

      setProjectTasks(taskCounts);

      // Temporariamente, ainda carregamos dados do localStorage para equipes e usuários
      // até que esses endpoints sejam implementados
      const storedTeams = localStorage.getItem('teams');
      if (storedTeams) {
        setTeams(JSON.parse(storedTeams));
      }

      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
      setError('Não foi possível carregar os projetos. Tente novamente mais tarde.');

      // Fallback para dados do localStorage se a API falhar
      const storedProjects = localStorage.getItem('projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Carregar tarefas para todos os projetos quando o componente é montado
  useEffect(() => {
    const loadAllProjectTasks = async () => {
      if (projects.length > 0) {
        for (const project of projects) {
          if (project.id && !projectTasksData[project.id]) {
            try {
              const tasks = await taskService.getTasksByProject(project.id);
              setProjectTasksData(prev => ({
                ...prev,
                [project.id]: tasks
              }));
            } catch (err) {
              console.error(`Erro ao carregar tarefas do projeto ${project.id}:`, err);
            }
          }
        }
      }
    };

    loadAllProjectTasks();
  }, [projects]);

  const handleAddProject = async () => {
    // Fechar o diálogo e recarregar os projetos
    setIsDialogOpen(false);
    await fetchProjects();
  };

  const handleEditProject = async () => {
    // Fechar o diálogo de edição e recarregar os projetos
    setIsEditDialogOpen(false);
    setSelectedProject(null);
    await fetchProjects();
  };

  const editProject = (project: UIProject) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  const viewProject = async (project: UIProject) => {
    // Criar uma cópia do projeto para não modificar o original
    const projectCopy = { ...project } as UIProject;

    // Garantir que o status seja uma string para exibição no popup
    if (typeof projectCopy.status === 'boolean') {
      // Converter o status booleano para string e armazenar em uma nova propriedade
      projectCopy.statusText = projectCopy.status ? "Ativo" : "Inativo";
    }

    setSelectedProject(projectCopy);

    // Carregar tarefas do projeto
    if (project.id && !projectTasksData[project.id]) {
      try {
        const tasks = await taskService.getTasksByProject(project.id);
        setProjectTasksData(prev => ({
          ...prev,
          [project.id]: tasks
        }));
      } catch (err) {
        console.error(`Erro ao carregar tarefas do projeto ${project.id}:`, err);
      }
    }

    setIsViewProjectOpen(true);
  };

  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Sem equipe';
  };

  const getProjectMembers = (memberIds: number[] = []) => {
    if (!memberIds || memberIds.length === 0) return [];
    return users.filter(user => memberIds.includes(user.id));
  };

  // Função para carregar tarefas de um projeto específico
  const [projectTasksData, setProjectTasksData] = useState<Record<number, any[]>>({});

  // Cache para armazenar o progresso calculado de cada projeto
  const [projectProgressCache, setProjectProgressCache] = useState<Record<number, number>>({});

  // Obter tarefas de um projeto
  const getProjectTasks = (projectId: number) => {
    return projectTasksData[projectId] || [];
  };

  // Calcular o progresso do projeto sem atualizar o estado diretamente
  const calculateProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    // Contar tarefas concluídas
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    // Calcular a porcentagem de progresso
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // Atualizar o cache de progresso quando as tarefas são carregadas
  useEffect(() => {
    const updateProgressCache = () => {
      const newCache: Record<number, number> = {};

      // Calcular o progresso para cada projeto com tarefas carregadas
      Object.entries(projectTasksData).forEach(([projectId, tasks]) => {
        const numericId = Number(projectId);
        newCache[numericId] = calculateProgress(tasks);
      });

      // Atualizar o cache apenas se houver mudanças
      if (Object.keys(newCache).length > 0) {
        setProjectProgressCache(prev => ({
          ...prev,
          ...newCache
        }));
      }
    };

    updateProgressCache();
  }, [projectTasksData]);

  // Função segura para obter o progresso do projeto
  const calculateProjectProgress = (project: UIProject) => {
    // Se o progresso já estiver em cache, retornar o valor em cache
    if (projectProgressCache[project.id]) {
      return projectProgressCache[project.id];
    }

    // Se não estiver em cache, calcular sem atualizar o estado
    const tasks = getProjectTasks(project.id);
    return calculateProgress(tasks);
  };

  const getProjectTaskCount = (projectId: number) => {
    // Retorna a contagem de tarefas do projeto a partir do estado
    return projectTasks[projectId] || 0;
  };

  const navigateToProject = (projectId: number) => {
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
          </div>
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
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
            projects.map((project) => {
              const progress = calculateProjectProgress(project);
              // Obter membros do projeto (usando a propriedade users da API)
              const members = getProjectMembers((project as UIProject).members || project.users?.map(u => typeof u === 'object' ? u.id : u) || []);
              const taskCount = getProjectTaskCount(project.id);

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
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation(); // Evita que o clique propague para o card
                              editProject(project);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Projeto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{project.description}</p>

                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progresso</span>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>

                      <div className="flex items-center justify-between mb-4">
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
                          <span>{new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
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
              <ProjectForm
                projectId={selectedProject.id}
                initialData={selectedProject}
                onSuccess={handleEditProject}
              />
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
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progresso</span>
                        <span className="text-xs font-medium">{calculateProjectProgress(selectedProject)}%</span>
                      </div>
                      <Progress value={calculateProjectProgress(selectedProject)} className="h-2" />
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
                    <p className="text-sm leading-relaxed">{selectedProject.description}</p>
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
                      {getProjectMembers(selectedProject.members).length > 4 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => navigateToProject(selectedProject.id)}
                        >
                          Ver Todos
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {getProjectMembers(selectedProject.members).length > 0 ? (
                        getProjectMembers(selectedProject.members).slice(0, 4).map((member) => (
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
                      )}
                      {getProjectMembers(selectedProject.members).length > 4 && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          + {getProjectMembers(selectedProject.members).length - 4} outros membros
                        </p>
                      )}
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
                               task.status === 'in-progress' ? 'Em Progresso' :
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

              <DialogFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigateToProject(selectedProject.id)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Abrir Projeto
                </Button>
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
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Projects;
