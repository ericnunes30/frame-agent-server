
import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TasksList } from '@/components/dashboard/TasksList';
import { TaskForm } from '@/components/forms/TaskForm';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { projectService, Project, taskService } from '@/lib/api';
import { toast } from "sonner";

const Tasks = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const kanbanBoardRef = useRef<any>(null);
  const tasksListRef = useRef<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Extrair projectId da query string
  const searchParams = new URLSearchParams(location.search);
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        // Carregar projetos da API
        const projectsList = await projectService.getProjects();
        setProjects(projectsList);

        // Se há um projectId na URL, encontrar o projeto correspondente
        if (projectId) {
          try {
            const project = await projectService.getProject(projectId);
            setCurrentProject(project);
          } catch (err) {
            console.error('Erro ao carregar projeto específico:', err);
            setError('Projeto não encontrado ou inacessível.');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar projetos:', err);
        setError('Não foi possível carregar os projetos. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [projectId]);

  const handleTaskFormSuccess = async (taskData: any) => {
    try {
      // Criar a tarefa na API
      await taskService.createTask(taskData);

      setIsDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');

      // Recarregar os componentes de tarefas
      if (kanbanBoardRef.current && activeTab === 'kanban') {
        kanbanBoardRef.current.fetchTasks();
      }

      if (tasksListRef.current && activeTab === 'list') {
        tasksListRef.current.fetchTasks();
      }
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            {loading ? (
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
          <Button className="gap-1" disabled={loading} onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            Nova Tarefa
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da tarefa. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <TaskForm onSuccess={handleTaskFormSuccess} defaultProjectId={projectId} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="kanban" className="w-full" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="mt-6">
            <div className="min-h-[500px]">
              <KanbanBoard ref={kanbanBoardRef} projectId={projectId} />
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <div className="border rounded-lg p-4">
              <TasksList ref={tasksListRef} projectId={projectId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
