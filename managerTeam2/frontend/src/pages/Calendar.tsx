
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from 'react-router-dom';

// Map para prioridades dos badges
const priorityMap = {
  high: { label: 'Alta', variant: 'destructive' as const },
  medium: { label: 'Média', variant: 'default' as const },
  low: { label: 'Baixa', variant: 'secondary' as const },
};

const Calendar = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<any[]>([]);

  useEffect(() => {
    // Carregar tarefas do localStorage
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const parsedTasks = JSON.parse(storedTasks);
      setTasks(parsedTasks);
      
      // Filtrar tarefas para o dia selecionado
      filterTasksForSelectedDay(parsedTasks, date);
    }
  }, [date]);

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
    const hasTask = tasks.some(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, day);
    });
    
    return hasTask;
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
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
              <div className="space-y-4">
                {tasksForSelectedDay.length > 0 ? (
                  tasksForSelectedDay.map((task) => (
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
                        <span>Projeto: {task.project}</span>
                        <span>Status: {
                          task.status === 'todo' ? 'A Fazer' :
                          task.status === 'inProgress' ? 'Em Progresso' :
                          task.status === 'review' ? 'Revisão' :
                          task.status === 'done' ? 'Concluído' : task.status
                        }</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma tarefa para esta data.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Calendar;
