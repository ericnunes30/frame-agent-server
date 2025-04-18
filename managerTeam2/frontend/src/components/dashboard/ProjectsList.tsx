
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Users, AlertCircle, Edit } from 'lucide-react';
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
import { projectService, Project } from '@/lib/api';

export const ProjectsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentProjects = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Buscar todos os projetos e pegar os 4 mais recentes
        const allProjects = await projectService.getProjects();

        // Ordenar por data de criação (mais recentes primeiro) e pegar os primeiros 4
        const recentProjects = [...allProjects]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4);

        setProjects(recentProjects);
      } catch (err) {
        console.error('Erro ao carregar projetos recentes:', err);
        setError('Não foi possível carregar os projetos recentes.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentProjects();
  }, []);

  // Função para calcular o progresso do projeto com base nas tarefas concluídas
  const calculateProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) {
      return 0;
    }

    // Contar tarefas concluídas
    const completedTasks = project.tasks.filter(task => task.status === 'concluido').length;

    // Calcular a porcentagem de progresso
    return Math.round((completedTasks / project.tasks.length) * 100);
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
            <AlertDescription>{error}</AlertDescription>
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
          ) : projects.length > 0 ? (
            projects.map((project) => {
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
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Projeto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
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
