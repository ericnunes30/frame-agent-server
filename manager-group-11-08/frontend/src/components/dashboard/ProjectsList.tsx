
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Users, AlertCircle, Edit, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { Project } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

export const ProjectsList = () => {
  const navigate = useNavigate();
  const { projects: projectsService } = useBackendServices();
  const { data: projects = [], isLoading, error } = projectsService.useGetProjects();

  // Hooks de autenticação e permissões
  const { user } = useAuth();
  const permissions = usePermissions();

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0; // Trata undefined/null como 0 para ir para o início ou usar Infinity para ir para o fim
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0; // Trata undefined/null como 0
        return dateB - dateA; // Para ordenar do mais recente para o mais antigo
      })
      .slice(0, 4);
  }, [projects]);

  // Função para calcular o progresso do projeto com base nas tarefas concluídas
  const calculateProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) {
      return 0;
    }

    // Criar uma cópia das tarefas para evitar compartilhamento de referência
    const tasks = [...project.tasks];

    // Contar tarefas concluídas
    const completedTasks = tasks.filter(task => task.status === 'concluido').length;

    // Calcular a porcentagem de progresso
    const progress = Math.round((completedTasks / tasks.length) * 100);



    return progress;
  };

  // Função para navegar para a página de detalhes do projeto
  const navigateToProject = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projetos Recentes</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/projects')}
        >
          Ver Todos
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error instanceof Error ? error.message : 'Erro ao carregar projetos'}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {isLoading ? (
            // Esqueletos de carregamento
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-40 mb-2" />
                  <div className="flex items-center justify-between">
                    <div className="w-full max-w-[180px]">
                      <div className="flex justify-between mb-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : recentProjects.length > 0 ? (
            recentProjects.map((project) => {
              // Calculamos o progresso individualmente para cada projeto
              const progress = calculateProgress(project);

              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => navigateToProject(project.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{project.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigateToProject(project.id);
                          }}>
                            {permissions.isMember ? (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Projeto
                              </>
                            ) : (
                              <>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Projeto
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description || 'Sem descrição.' }} />
                    <div className="flex items-center justify-between">
                      <div className="w-full max-w-[180px]">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progresso</span>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.status ? "default" : "secondary"} className="ml-auto">
                          {project.status ? "Ativo" : "Inativo"}
                        </Badge>
                        <div className="flex items-center">
                          <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {project.users?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center border rounded-lg">
              <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
