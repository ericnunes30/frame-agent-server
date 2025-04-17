
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BriefcaseIcon, CheckIcon, ListTodoIcon, ClockIcon } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { projectService, taskService } from '@/lib/api';

export const DashboardStats = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    newProjects: 0,
    pendingTasks: 0,
    urgentTasks: 0,
    completedTasks: 0,
    todayCompletedTasks: 0,
    totalHours: 0,
    todayHours: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      try {
        // Buscar projetos
        const projects = await projectService.getProjects();

        // Contar projetos ativos
        const activeProjects = projects.filter(project => project.status).length;

        // Contar projetos novos (criados nos últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newProjects = projects.filter(
          project => new Date(project.created_at) > thirtyDaysAgo
        ).length;

        // Buscar tarefas
        const tasks = await taskService.getTasks();

        // Contar tarefas pendentes
        const pendingTasks = tasks.filter(
          task => task.status === 'a_fazer' || task.status === 'pendente'
        ).length;

        // Contar tarefas urgentes
        const urgentTasks = tasks.filter(
          task => task.priority === 'alta' || task.priority === 'urgente'
        ).length;

        // Contar tarefas concluídas
        const completedTasks = tasks.filter(
          task => task.status === 'concluido'
        ).length;

        // Contar tarefas concluídas hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCompletedTasks = tasks.filter(
          task => task.status === 'concluido' && new Date(task.updated_at) > today
        ).length;

        // Simular horas trabalhadas (não temos essa informação na API)
        const totalHours = tasks.length * 3; // Estimativa de 3 horas por tarefa
        const todayHours = Math.floor(Math.random() * 10); // Valor aleatório para demonstração

        setStats({
          activeProjects,
          newProjects,
          pendingTasks,
          urgentTasks,
          completedTasks,
          todayCompletedTasks,
          totalHours,
          todayHours
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
          <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newProjects} novos neste mês
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
          <ListTodoIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.urgentTasks} com prioridade alta
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          <CheckIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.todayCompletedTasks} hoje
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground">
                +{stats.todayHours} desde ontem
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
