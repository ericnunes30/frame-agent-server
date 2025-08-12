
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBackendServices } from '@/hooks/useBackendServices';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from 'react-router-dom';
import { Task } from '@/common/types'; // Importar o tipo Task

// Map para prioridades dos badges
const priorityMap = {
  alta: { label: 'Alta', variant: 'destructive' as const },
  media: { label: 'Média', variant: 'default' as const },
  baixa: { label: 'Baixa', variant: 'secondary' as const },
  urgente: { label: 'Urgente', variant: 'destructive' as const }, // Adicionado
};

const Calendar = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]); // Tipar com Task[]
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<Task[]>([]); // Tipar com Task[]
  const services = useBackendServices();

  // Lógica antiga de carregamento de tarefas (comentada após validação)
  // useEffect(() => {
  //   const storedTasks = localStorage.getItem('tasks');
  //   if (storedTasks) {
  //     const parsedTasks: Task[] = JSON.parse(storedTasks); // Tipar parsedTasks
  //     setTasks(parsedTasks);
  //     filterTasksForSelectedDay(parsedTasks, date);
  //   }
  // }, [date]);

  // Nova lógica com TanStack Query
  const { data: queryTasks, isLoading: isLoadingQuery, error: errorQuery } = useQuery<Task[], Error>({ // Tipar useQuery
    queryKey: ['calendarTasks'],
    queryFn: () => taskService.getTasks(), // Usar taskService.getTasks diretamente
  });

  // Efeito para filtrar tarefas do TanStack Query quando queryTasks ou date mudarem
  useEffect(() => {
    if (queryTasks) {
      setTasks(queryTasks); // Atualiza o estado tasks com os dados do query
      filterTasksForSelectedDay(queryTasks, date);
    }
  }, [queryTasks, date]);

  // Log para comparar resultados (Fase 3, item 2) - Manter por enquanto para validação
  useEffect(() => {
    console.log('Old Tasks State (from localStorage):', localStorage.getItem('tasks') ? JSON.parse(localStorage.getItem('tasks')!) : null);
    console.log('Query Tasks Data:', queryTasks);
    console.log('Query Loading State:', isLoadingQuery);
    console.log('Query Error State:', errorQuery);
  }, [queryTasks, isLoadingQuery, errorQuery]);

  const filterTasksForSelectedDay = (tasksList: any[], selectedDate: Date) => {
    const filteredTasks = tasksList.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, selectedDate);
    });

    setTasksForSelectedDay(filteredTasks);
  };

  // Função para identificar dias com tarefas
  const getDaysWithTasks = (day: Date) => {
    if (!queryTasks) return false; // Se os dados ainda não foram carregados
    const hasTask = queryTasks.some(task => { // Usar queryTasks
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, day);
    });

    return hasTask;
  };

  const handleTaskClick = (taskId: number) => { // taskId agora é number
    navigate(`/tasks/${taskId.toString()}`); // Converter para string
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">
            Visualize suas tarefas em um calendário e gerencie seus prazos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Selecione uma data</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                locale={ptBR}
                className="mx-auto"
                modifiers={{
                  hasTasks: (day) => getDaysWithTasks(day),
                }}
                modifiersClassNames={{
                  hasTasks: "bg-primary/20 font-bold",
                }}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Tarefas para {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingQuery ? (
                <div className="text-center py-8 text-muted-foreground">Carregando tarefas...</div>
              ) : errorQuery ? (
                <div className="text-center py-8 text-destructive">Erro ao carregar tarefas: {errorQuery.message}</div>
              ) : tasksForSelectedDay.length > 0 ? (
                <div className="space-y-4">
                  {tasksForSelectedDay.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 border rounded-lg hover:bg-accent/10 cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge variant={priorityMap[task.priority]?.variant || 'default'}>
                          {priorityMap[task.priority]?.label || 'Média'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'Sem descrição'}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Projeto: {task.project?.title || 'N/A'}</span>
                        <span>Status: {
                          task.status === 'a_fazer' ? 'A Fazer' :
                          task.status === 'em_andamento' ? 'Em Andamento' :
                          task.status === 'em_revisao' ? 'Em Revisão' :
                          task.status === 'concluido' ? 'Concluído' :
                          task.status === 'pendente' ? 'Pendente' : task.status
                        }</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma tarefa para esta data.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Calendar;
