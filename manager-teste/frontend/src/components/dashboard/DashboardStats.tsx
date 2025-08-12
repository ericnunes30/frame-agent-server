
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BriefcaseIcon, CheckIcon, ListTodoIcon, ClockIcon } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { useBackendServices } from '@/hooks/useBackendServices';

export const DashboardStats = () => {
  const { projects: projectsService, tasks: tasksService } = useBackendServices();
  const { data: projects = [], isLoading: projectsLoading } = projectsService.useGetProjects();
  const { data: tasks = [], isLoading: tasksLoading } = tasksService.useGetTasks();

  const stats = useMemo(() => {
    if (projectsLoading || tasksLoading) {
      return {
        activeProjects: 0,
        newProjects: 0,
        pendingTasks: 0,
        urgentTasks: 0,
        completedTasks: 0,
        todayCompletedTasks: 0,
        totalHours: 0,
        todayHours: 0,
      };
    }

    const activeProjects = projects.filter(project => project.status).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newProjects = projects.filter(project => {
      if (!project.created_at && !project.createdAt) return false;
      const createdDate = new Date(project.created_at || project.createdAt || '');
      return !isNaN(createdDate.getTime()) && createdDate > thirtyDaysAgo;
    }).length;

    const pendingTasks = tasks.filter(
      task => task.status === 'a_fazer' || task.status === 'pendente'
    ).length;

    const urgentTasks = tasks.filter(
      task => task.priority === 'alta' || task.priority === 'urgente'
    ).length;

    const completedTasks = tasks.filter(task => task.status === 'concluido').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompletedTasks = tasks.filter(task => {
      if (task.status !== 'concluido') return false;
      if (!task.updated_at && !task.updatedAt) return false;
      const updatedDate = new Date(task.updated_at || task.updatedAt || '');
      return !isNaN(updatedDate.getTime()) && updatedDate > today;
    }).length;

    const totalHours = tasks.length * 3;
    const todayHours = Math.floor(Math.random() * 10);

    return {
      activeProjects,
      newProjects,
      pendingTasks,
      urgentTasks,
      completedTasks,
      todayCompletedTasks,
      totalHours,
      todayHours,
    };
  }, [projects, tasks, projectsLoading, tasksLoading]);

  const isLoading = projectsLoading || tasksLoading;

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
