
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProjectsList } from '@/components/dashboard/ProjectsList';
import { TasksList } from '@/components/dashboard/TasksList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo ao seu painel de gerenciamento de projetos e tarefas.
            </p>
          </div>
          <Button
            className="gap-1"
            onClick={() => navigate('/projects')}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        <DashboardStats />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
            <TabsTrigger value="projects">Meus Projetos</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <ProjectsList />
              <TasksList />
            </div>
          </TabsContent>
          <TabsContent value="tasks" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Minhas Tarefas</h2>
            <p className="text-muted-foreground mb-6">Visualize e gerencie todas as suas tarefas pendentes.</p>
            <div className="border rounded-lg p-6">
              <p className="text-center text-muted-foreground">Conteúdo de tarefas será implementado em breve.</p>
            </div>
          </TabsContent>
          <TabsContent value="projects" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Meus Projetos</h2>
            <p className="text-muted-foreground mb-6">Acompanhe todos os projetos que você está participando.</p>
            <div className="border rounded-lg p-6">
              <p className="text-center text-muted-foreground">Conteúdo de projetos será implementado em breve.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Index;
