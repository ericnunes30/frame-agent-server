
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MoreHorizontal, PlusCircle, AlertTriangle, Clock, Calendar, ChevronLeft, Edit, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import { TaskForm } from '@/components/forms/TaskForm';
import { format, isAfter, isBefore, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const tasksArray = JSON.parse(storedTasks);
      const foundTask = tasksArray.find(t => t.id === taskId);

      if (foundTask) {
        setTask(foundTask);

        const storedComments = localStorage.getItem(`comments_${taskId}`);
        if (storedComments) {
          setComments(JSON.parse(storedComments));
        }

        const storedProjects = localStorage.getItem('projects');
        if (storedProjects) {
          const projectsArray = JSON.parse(storedProjects);
          const foundProject = projectsArray.find(p => p.id === foundTask.project);
          if (foundProject) {
            setProject(foundProject);
          }
        }
      } else {
        navigate('/tasks');
        toast({
          title: "Tarefa não encontrada",
          description: "A tarefa solicitada não existe ou foi removida.",
          variant: "destructive",
        });
      }
    }
  }, [taskId, navigate]);

  const handleBackClick = () => {
    navigate('/tasks');
  };

  const handleEditTask = (updatedTask) => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const tasksArray = JSON.parse(storedTasks);
      const updatedTasks = tasksArray.map(t =>
        t.id === taskId ? { ...t, ...updatedTask } : t
      );

      localStorage.setItem('tasks', JSON.stringify(updatedTasks));

      setTask({ ...task, ...updatedTask });
      setIsEditSheetOpen(false);

      toast({
        title: "Tarefa atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    }
  };

  const handleDeleteTask = () => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const tasksArray = JSON.parse(storedTasks);
      const filteredTasks = tasksArray.filter(t => t.id !== taskId);

      localStorage.setItem('tasks', JSON.stringify(filteredTasks));

      localStorage.removeItem(`comments_${taskId}`);

      navigate('/tasks');

      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida permanentemente.",
      });
    }
  };

  const handleToggleComplete = () => {
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };

    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const tasksArray = JSON.parse(storedTasks);
      const updatedTasks = tasksArray.map(t =>
        t.id === taskId ? updatedTask : t
      );

      localStorage.setItem('tasks', JSON.stringify(updatedTasks));

      setTask(updatedTask);

      toast({
        title: updatedTask.completed ? "Tarefa concluída" : "Tarefa reaberta",
        description: updatedTask.completed
          ? "A tarefa foi marcada como concluída."
          : "A tarefa foi marcada como pendente.",
      });
    }
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;

    const newComment = {
      id: Date.now().toString(),
      text: comment,
      createdAt: new Date().toISOString(),
      user: 'Usuário Atual'
    };

    const updatedComments = [...comments, newComment];

    localStorage.setItem(`comments_${taskId}`, JSON.stringify(updatedComments));

    setComments(updatedComments);
    setComment('');

    toast({
      title: "Comentário adicionado",
      description: "Seu comentário foi adicionado com sucesso.",
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatPriority = (priority) => {
    switch (priority) {
      case 'high':
        return { label: 'Alta', variant: "destructive" as const };
      case 'medium':
        return { label: 'Média', variant: "default" as const };
      case 'low':
        return { label: 'Baixa', variant: "secondary" as const };
      default:
        return { label: 'Média', variant: "default" as const };
    }
  };

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);

    // Se a data já passou
    if (isPast(dueDateObj) && dueDateObj.getDate() !== today.getDate()) {
      return {
        label: "Atrasada",
        variant: "destructive" as const,
        icon: <AlertCircle className="h-4 w-4 mr-1" />
      };
    }

    // Se a data é hoje
    if (dueDateObj.getDate() === today.getDate() &&
        dueDateObj.getMonth() === today.getMonth() &&
        dueDateObj.getFullYear() === today.getFullYear()) {
      return {
        label: "Hoje",
        variant: "default" as const,
        icon: <Clock className="h-4 w-4 mr-1" />
      };
    }

    // Se a data é nos próximos 3 dias
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    if (isBefore(dueDateObj, threeDaysLater)) {
      return {
        label: "Em breve",
        variant: "secondary" as const,
        icon: <Clock className="h-4 w-4 mr-1" />
      };
    }

    // Caso contrário, está no prazo
    return {
      label: "No prazo",
      variant: "outline" as const,
      icon: <Calendar className="h-4 w-4 mr-1" />
    };
  };

  if (!task) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  const priorityInfo = formatPriority(task.priority);
  const dueDateStatus = task.dueDate ? getDueDateStatus(task.dueDate) : null;

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="gap-1"
              onClick={handleBackClick}
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex gap-2">
              <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Editar Tarefa</SheetTitle>
                    <SheetDescription>
                      Faça alterações na tarefa e clique em salvar quando terminar.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <TaskForm
                      initialData={task}
                      onSuccess={handleEditTask}
                      submitButtonText="Salvar Alterações"
                      isEditMode={true}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir Tarefa</DialogTitle>
                    <DialogDescription>
                      Tem certeza que deseja excluir esta tarefa?
                      Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                    <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                    <p className="text-sm">Todos os dados relacionados a esta tarefa serão perdidos.</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteTask}>
                      Excluir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="task-complete"
                      checked={task.completed}
                      onCheckedChange={handleToggleComplete}
                    />
                    <CardTitle className={task.completed ? "line-through text-muted-foreground" : ""}>
                      {task.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    {project ? `Projeto: ${project.name}` : 'Sem projeto associado'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={priorityInfo.variant}>
                    {priorityInfo.label}
                  </Badge>
                  {dueDateStatus && (
                    <Badge variant={dueDateStatus.variant} className="flex items-center">
                      {dueDateStatus.icon}
                      {dueDateStatus.label}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="comments">
                    Comentários
                    {comments.length > 0 && ` (${comments.length})`}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-6 pt-4">
                  <div>
                    <h3 className="font-medium mb-2">Descrição</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {task.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-2">Datas</h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>Criada em: {formatDate(task.createdAt)}</span>
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Prazo: {formatDate(task.dueDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Status</h3>
                      <Badge variant={task.completed ? "default" : "outline"}>
                        {task.completed ? 'Concluída' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="comments" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    {comments.length > 0 ? (
                      comments.map(comment => (
                        <div key={comment.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{comment.user}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum comentário ainda. Seja o primeiro a comentar!
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Adicione um comentário..."
                      className="min-h-[80px]"
                    />
                    <Button
                      onClick={handleAddComment}
                      className="self-end"
                      disabled={!comment.trim()}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Comentar
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default TaskDetails;
