import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Componentes da tabela Shadcn/ui
import { Badge } from "@/components/ui/badge"; // Componente Badge Shadcn/ui
import { Button } from "@/components/ui/button"; // Componente Button Shadcn/ui
import { Calendar, User, AlertCircle, Edit, Trash2, MoreHorizontal, Clock, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'; // Ícones Lucide
import { Link } from 'react-router-dom'; // Para links (se necessário, não usado diretamente na lista)
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal"; // Modal de detalhes da tarefa (assumindo que existe)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Componente DropdownMenu Shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Removido pois o diálogo é controlado por estado
  DialogFooter,
} from "@/components/ui/dialog"; // Componente Dialog Shadcn/ui
import { TaskTimer } from '../tasks/TaskTimer'; // Componente de temporizador para tarefas
import { Skeleton } from "@/components/ui/skeleton"; // Componente Skeleton Shadcn/ui
import { Alert, AlertDescription } from "@/components/ui/alert"; // Componente Alert Shadcn/ui
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // Componente Calendar Shadcn/ui (renomeado para evitar conflito)
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Componente Popover Shadcn/ui
import { format } from "date-fns"; // Biblioteca para formatação de datas
import { ptBR } from "date-fns/locale"; // Localização PT-BR para date-fns
import { cn } from "@/utils/utils"; // Utilitário para classes condicionais (comum com Shadcn/ui)
import { Task, TaskPriority, TaskStatus, UpdateTaskRequest, Team } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { toast } from "sonner"; // Biblioteca para notificações (toast)
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

// --- Funções Auxiliares para Estilização e Labels ---

// Retorna a variante de cor do Badge com base na prioridade
const getPriorityColor = (priority: TaskPriority): "destructive" | "default" | "secondary" => {
  switch (priority) {
    case "alta":
    case "urgente":
      return "destructive";
    case "media":
      return "default";
    case "baixa":
    default:
      return "secondary";
  }
};

// Retorna o texto da label com base na prioridade
const getPriorityLabel = (priority: TaskPriority): string => {
  switch (priority) {
    case "alta": return "Alta";
    case "urgente": return "Urgente";
    case "media": return "Média";
    case "baixa": return "Baixa";
    default: return "Média";
  }
};

// Retorna o texto da label com base no status
const getStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case "pendente": return "Pendente";
    case "a_fazer": return "A Fazer";
    case "em_andamento": return "Em Andamento";
    case "em_revisao": return "Em Revisão";
    case "aguardando_cliente": return "Aguardando Cliente";
    case "concluido": return "Concluído";
    case "cancelado": return "Cancelado";
    default: return "A Fazer";
  }
};

// Retorna a variante de cor do Badge com base no status
const getStatusColor = (status: TaskStatus): "secondary" | "default" | "destructive" | "outline" => {
  switch (status) {
    case "pendente":
    case "a_fazer":
      return "secondary";
    case "em_andamento":
      return "default";
    case "em_revisao":
      return "outline";
    case "aguardando_cliente":
      return "outline";
    case "concluido":
      return "default";
    case "cancelado":
      return "destructive";
    default:
      return "secondary";
  }
};

// --- Props do Componente ---
interface TasksListProps {
  projectId?: string | number; // ID do projeto (opcional, para filtrar tarefas)
  teams?: Team[]; // Lista de equipes (não usado diretamente no fetch, mas pode ser útil)
  selectedTeamId?: number | null; // ID da equipe selecionada (para filtrar tarefas)
  selectedUserId?: number | null; // ID do usuário selecionado (para filtrar tarefas)
  viewMode?: 'status' | 'date'; // Modo de visualização ('status' ou 'date')
  priorityFilter?: TaskPriority | null; // Filtro por prioridade
  onTasksUpdated?: () => Promise<void>; // Callback para notificar o componente pai sobre atualizações
  forceUserFilter?: boolean; // Força a filtragem pelo ID do usuário logado, mesmo que não seja membro
  showCompleted?: boolean; // Adicionado para controlar a exibição de tarefas concluídas
  showProject?: boolean; // Controla a exibição da coluna de projeto
}

// --- Definição do Componente ---
// Usa forwardRef para permitir que o componente pai chame fetchTasks
export const TasksList = forwardRef<{ fetchTasks: () => Promise<void> }, TasksListProps>((props, ref) => {
  const {
    projectId,
    teams,
    selectedTeamId,
    selectedUserId,
    viewMode = 'status',
    priorityFilter,
    forceUserFilter,
    showCompleted = false,
    showProject
  } = props;

  // --- Estados do Componente ---
  const [tasks, setTasks] = useState<Task[]>([]); // Lista de tarefas
  const [projects, setProjects] = useState<Record<number, string>>({}); // Mapa de ID de projeto para nome
  const [users, setUsers] = useState<Record<number, string>>({}); // Mapa de ID de usuário para nome
  const [error, setError] = useState<string | null>(null); // Estado de erro
  const [sortField, setSortField] = useState<string | null>(null); // Campo de ordenação
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Direção da ordenação

  // Importar hooks de autenticação e permissões
  const { user } = useAuth();
  const permissions = usePermissions();

  // Função para lidar com ordenação - memoizada para evitar re-renders
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Função memoizada para ordenar tarefas - otimizada para evitar recálculos desnecessários
  const sortedTasks = useMemo(() => {
    if (!sortField) {
      return tasks;
    }

    const sorted = [...tasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'project':
          aValue = projects[a.project_id]?.toLowerCase() || '';
          bValue = projects[b.project_id]?.toLowerCase() || '';
          break;
        case 'assignee':
          aValue = a.users?.[0] ? (typeof a.users[0] === 'object' ? a.users[0].name : users[a.users[0]]) || '' : '';
          bValue = b.users?.[0] ? (typeof b.users[0] === 'object' ? b.users[0].name : users[b.users[0]]) || '' : '';
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { 'baixa': 1, 'media': 2, 'alta': 3, 'urgente': 4 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = {
            'pendente': 0,
            'a_fazer': 1,
            'em_andamento': 2,
            'em_revisao': 3,
            'aguardando_cliente': 4,
            'concluido': 5,
            'cancelado': 6
          };
          aValue = statusOrder[a.status] ?? 99;
          bValue = statusOrder[b.status] ?? 99;
          break;
        case 'date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [tasks, sortField, sortDirection, projects, users]);

  // Função para ordenar um grupo específico de tarefas
  const sortGroup = (group: Task[]) => {
    if (!sortField) return group;
    
    return [...group].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'project':
          aValue = projects[a.project_id]?.toLowerCase() || '';
          bValue = projects[b.project_id]?.toLowerCase() || '';
          break;
        case 'assignee':
          aValue = a.users?.[0] ? (typeof a.users[0] === 'object' ? a.users[0].name : users[a.users[0]]) || '' : '';
          bValue = b.users?.[0] ? (typeof b.users[0] === 'object' ? b.users[0].name : users[b.users[0]]) || '' : '';
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { 'baixa': 1, 'media': 2, 'alta': 3, 'urgente': 4 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = {
            'pendente': 0,
            'a_fazer': 1,
            'em_andamento': 2,
            'em_revisao': 3,
            'aguardando_cliente': 4,
            'concluido': 5,
            'cancelado': 6
          };
          aValue = statusOrder[a.status] ?? 99;
          bValue = statusOrder[b.status] ?? 99;
          break;
        case 'date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Componente para cabeçalho clicável
  const SortableHeader = ({ field, children }: { field: string, children: React.ReactNode }) => {
    const getSortIcon = () => {
      if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
      return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    return (
      <TableHead>
        <button
          onClick={() => handleSort(field)}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          {children}
          {getSortIcon()}
        </button>
      </TableHead>
    );
  };

  // Estados para modais e diálogos
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false); // Controla o modal de detalhes
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null); // ID da tarefa selecionada para modal/diálogo
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // Controla o diálogo de confirmação de exclusão
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null); // ID da tarefa com timer em execução

  const { tasks: tasksService, users: usersService } = useBackendServices();
  const userService = usersService.userService; // Estabiliza a referência
  const {
    data: allTasks = [],
    isLoading: allTasksLoading,
    refetch: refetchTasks,
  } = tasksService.useGetTasks();
  const projectIdNumber =
    projectId !== undefined && projectId !== null
      ? typeof projectId === 'string'
        ? parseInt(projectId, 10)
        : projectId
      : 0;
  const {
    data: projectTasks = [],
    isLoading: projectTasksLoading,
    refetch: refetchProjectTasks,
  } = tasksService.useGetTasksByProject(projectIdNumber, Boolean(projectId));
  const { mutateAsync: updateTask } = tasksService.useUpdateTask();
  const { mutateAsync: deleteTaskMutation } = tasksService.useDeleteTask();

  const loading = projectId ? projectTasksLoading : allTasksLoading;

  // --- Funções de Fetch e Manipulação de Dados ---

  // Função para processar e filtrar tarefas (não faz fetch, apenas processa dados já carregados)
  const processAndFilterTasks = useCallback(async () => {
    setError(null);

    try {
      const tasksList: Task[] = projectId ? projectTasks : allTasks;

      // Filtra tarefas por equipe selecionada
      let filteredTasks = tasksList;
      if (selectedTeamId) {
        filteredTasks = tasksList.filter(task => {
          if (!task.occupations || !Array.isArray(task.occupations)) return false;
          // Verifica se a equipe selecionada está na lista de ocupações da tarefa
          return task.occupations.some(occupation =>
            (typeof occupation === 'number' && occupation === selectedTeamId) ||
            (typeof occupation === 'object' && occupation !== null && occupation.id === selectedTeamId)
          );
        });
      }

      // Filtra tarefas por usuário responsável (selecionado ou usuário atual se for membro)
      let userIdToFilter = selectedUserId;

      // Se o usuário for um membro ou se forceUserFilter for true, forçar a filtragem pelo ID do usuário logado
      // Mas não aplicar o filtro se forceUserFilter for explicitamente false

      if ((permissions.isMember && forceUserFilter !== false) || forceUserFilter === true) {
        // Obter o ID do usuário do localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            userIdToFilter = parsedUser.id;
          } catch (e) {
            console.error('Erro ao obter ID do usuário do localStorage:', e);
          }
        } else {
          // Tentar obter o ID do usuário do contexto de autenticação
          if (user && user.id) {
            userIdToFilter = user.id;
          }
        }
      }

      if (userIdToFilter) {


        filteredTasks = filteredTasks.filter(task => {
          if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;

          // Verifica se o usuário selecionado está na lista de usuários da tarefa
          return task.users.some(taskUser =>
            (typeof taskUser === 'number' && taskUser === userIdToFilter) ||
            (typeof taskUser === 'object' && taskUser !== null && taskUser.id === userIdToFilter)
          );
        });
      }

      // Aplicar filtro de prioridade
      if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
      }
 
      // Aplicar filtro de tarefas concluídas
      if (!props.showCompleted) {
        filteredTasks = filteredTasks.filter(task => task.status !== 'concluido');
      }
 
       // Ordena tarefas com base no modo de visualização
      if (viewMode === 'date') {
        // Ordena por data de vencimento (nulls/undefineds por último)
        filteredTasks.sort((a, b) => {
          const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return dateA - dateB;
        });
      } else {
        // Ordena por status (ordem customizada)
        const statusOrder: Record<TaskStatus, number> = {
            'pendente': 0,
            'a_fazer': 1,
            'em_andamento': 2,
            'em_revisao': 3,
            'aguardando_cliente': 4,
            'concluido': 5,
            'cancelado': 6
        };
        filteredTasks.sort((a, b) => {
          return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        });
      }
      setTasks(filteredTasks);

      // --- Mapeamento de Nomes de Projetos e Usuários ---
      const projectMap: Record<number, string> = {};
      const userMap: Record<number, string> = {};
      const userIdsToFetch = new Set<number>();

      tasksList.forEach(task => {
        // Mapeia projetos
        if (task.project && task.project.title) {
          projectMap[task.project_id] = task.project.title;
        } else if (!projectMap[task.project_id]) {
          projectMap[task.project_id] = `Projeto ${task.project_id}`; // Fallback
        }

        // Coleta IDs de usuários para buscar nomes (se não vierem na tarefa)
        if (task.users && Array.isArray(task.users)) {
          task.users.forEach(user => {
            if (typeof user === 'object' && user !== null && user.id && user.name) {
              userMap[user.id] = user.name; // Nome já veio na tarefa
            } else if (typeof user === 'number') {
              if (!userMap[user]) { // Adiciona ID para buscar depois, se ainda não tiver o nome
                  userIdsToFetch.add(user);
              }
            } else if (typeof user === 'object' && user !== null && user.id && !user.name) {
                 if (!userMap[user.id]) { // Adiciona ID para buscar depois, se ainda não tiver o nome
                  userIdsToFetch.add(user.id);
              }
            }
          });
        }
      });

      // Busca nomes de usuários que não vieram na tarefa (Otimização: fazer isso em paralelo ou com um endpoint que aceite múltiplos IDs)
      if (userIdsToFetch.size > 0) {
          try {
              // Exemplo: Buscando um por um (MELHORAR: buscar em lote se a API permitir)
              for (const userId of userIdsToFetch) {
                   if (!userMap[userId]) { // Verifica novamente caso tenha sido preenchido por outra tarefa
                       try {
                         const userDetails = await userService.getUser(userId); // Usando getUser
                         userMap[userId] = userDetails?.name ?? `Usuário ${userId}`;
                       } catch (userError) {
                         console.error(`Erro ao buscar usuário ${userId}:`, userError);
                         userMap[userId] = `Usuário ${userId}`;
                       }
                   }
              }
          } catch (userFetchError) {
              console.error("Erro ao buscar detalhes de usuários:", userFetchError);
              // Preenche com fallback para os IDs que falharam
              userIdsToFetch.forEach(id => {
                  if (!userMap[id]) {
                      userMap[id] = `Usuário ${id}`;
                  }
              });
          }
      }


      setProjects(projectMap);
      setUsers(userMap);

    } catch (err: unknown) {
      console.error('Erro detalhado ao carregar tarefas:', err);
      setError(`Não foi possível carregar as tarefas: ${err instanceof Error ? err.message : 'Erro desconhecido'}. Tente novamente mais tarde.`);
      setTasks([]); // Limpa tarefas em caso de erro
    }
  }, [projectId, selectedTeamId, selectedUserId, viewMode, priorityFilter, forceUserFilter, permissions.isMember, allTasks, projectTasks, props.showCompleted, user?.id, userService]); // Dependências do useCallback otimizadas

  // Expõe fetchTasks para o componente pai via ref (agora força re-fetch dos dados)
  useImperativeHandle(ref, () => ({
    fetchTasks: async () => {
      try {
        // Força re-fetch dos dados do React Query
        if (projectId) {
          await refetchProjectTasks();
        } else {
          await refetchTasks();
        }
      } catch (error) {
        console.error('Erro ao fazer re-fetch das tarefas:', error);
      }
    }
  }));

  // Processa tarefas sempre que os dados mudam
  useEffect(() => {
    if (!loading) {
      processAndFilterTasks();
    }
  }, [processAndFilterTasks, loading]);

  // Efeito adicional para forçar a renderização quando o modo de visualização mudar
  // Removido pois fetchTasks já tem viewMode como dependência e re-executa
  // useEffect(() => {
  //   console.log('Modo de visualização alterado para:', viewMode);
  // }, [viewMode]);

  // --- Funções de Formatação ---

  // Função para garantir que os caracteres especiais sejam exibidos corretamente
  const decodeText = (text: string | undefined | null): string => {
    if (!text) return '';
    try {
      // Casos específicos para textos comuns com problemas de codificação
      if (text.includes('autentica��o e autoriza��o')) {
        return text.replace('autentica��o e autoriza��o', 'autenticação e autorização');
      }

      // Caso específico para o texto com "Atualizado"
      if (text.includes('autentica��o e autoriza��o - Atualizado')) {
        return text.replace('autentica��o e autoriza��o - Atualizado', 'autenticação e autorização - Atualizado');
      }

      // Caso específico para "Implementar sistema de"
      if (text.includes('Implementar sistema de autentica��o e autoriza��o')) {
        return text.replace('Implementar sistema de autentica��o e autoriza��o', 'Implementar sistema de autenticação e autorização');
      }

      // Caso mais específico com "Atualizado"
      if (text.includes('Implementar sistema de autentica��o e autoriza��o - Atualizado')) {
        return 'Implementar sistema de autenticação e autorização - Atualizado';
      }

      // Verifica se o texto contém caracteres de substituição (�)
      if (text.includes('�')) {
        // Substituições comuns para caracteres portugueses
        return text
          .replace(/�/g, 'ç') // ç
          .replace(/�o/g, 'ção') // ção
          .replace(/�a/g, 'çã') // çã
          .replace(/�/g, 'ã') // ã
          .replace(/�/g, 'á') // á
          .replace(/�/g, 'é') // é
          .replace(/�/g, 'í') // í
          .replace(/�/g, 'ó') // ó
          .replace(/�/g, 'ú'); // ú
      }
      return text;
    } catch (e) {
      console.error('Erro ao decodificar texto:', e);
      return text;
    }
  };

  // Formata a data para exibição amigável
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Sem data';
    try {
        const date = new Date(dateString);
        // Verifica se a data é válida
        if (isNaN(date.getTime())) {
            return 'Data inválida';
        }

        // Usar a mesma abordagem de comparação de strings que usamos no agrupamento
        const dateStr = date.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        if (dateStr === todayStr) {
            // console.log(`Data ${dateString} identificada como HOJE`); // Log reduzido
            return 'Hoje';
        } else if (dateStr === tomorrowStr) {
            // console.log(`Data ${dateString} identificada como AMANHÃ`); // Log reduzido
            return 'Amanhã';
        } else {
            // Formata a data completa para outras datas
            return format(date, "dd/MM/yyyy", { locale: ptBR });
        }
    } catch (e) {
        console.error("Erro ao formatar data:", dateString, e);
        return "Erro na data";
    }
  };


  // --- Handlers de Interação (Eventos) ---

  // Manipula a mudança de status via Dropdown - memoizado para performance
  const handleStatusChange = useCallback(async (taskId: number, newStatus: TaskStatus) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) {
      toast.error('Tarefa não encontrada para atualizar status.');
      return;
    }

    // Optimistic UI Update
    const originalTasks = [...tasks];
    const updatedTasksOptimistic = tasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasksOptimistic);
    toast.info(`Atualizando status para ${getStatusLabel(newStatus)}...`);

    try {
      const updateData = { status: newStatus };
      await updateTask({ id: taskId, data: updateData });
      toast.success(`Status da tarefa atualizado para ${getStatusLabel(newStatus)}`);

      // Notificar o componente pai sobre a atualização das tarefas
      if (props.onTasksUpdated) {
        await props.onTasksUpdated();
      }
      // fetchTasks(); // Re-fetch pode ser desnecessário com optimistic update
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa:', err);
      toast.error('Erro ao atualizar status. Revertendo alteração.');
      setTasks(originalTasks); // Reverte em caso de erro
    }
  }, [tasks, updateTask, props.onTasksUpdated]);

  // Manipula a mudança de prioridade via Dropdown - memoizado para performance
  const handlePriorityChange = useCallback(async (taskId: number, newPriority: TaskPriority) => {
     const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) {
      toast.error('Tarefa não encontrada para atualizar prioridade.');
      return;
    }

    // Optimistic UI Update
    const originalTasks = [...tasks];
    const updatedTasksOptimistic = tasks.map(task =>
      task.id === taskId ? { ...task, priority: newPriority } : task
    );
    setTasks(updatedTasksOptimistic);
    toast.info(`Atualizando prioridade para ${getPriorityLabel(newPriority)}...`);

    try {
      const updateData = { priority: newPriority };
      await updateTask({ id: taskId, data: updateData });
      toast.success(`Prioridade da tarefa atualizada para ${getPriorityLabel(newPriority)}`);

      // Notificar o componente pai sobre a atualização das tarefas
      if (props.onTasksUpdated) {
        await props.onTasksUpdated();
      }
      // fetchTasks(); // Opcional
    } catch (err) {
      console.error('Erro ao atualizar prioridade da tarefa:', err);
      toast.error('Erro ao atualizar prioridade. Revertendo alteração.');
      setTasks(originalTasks); // Reverte em caso de erro
    }
  }, [tasks, updateTask, props.onTasksUpdated]);

  // Manipula a mudança de data de vencimento via Popover/Calendar - memoizado para performance
  const handleDueDateChange = useCallback(async (taskId: number, newDate: Date | undefined) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) {
      toast.error('Tarefa não encontrada para atualizar data.');
      return;
    }

    const newDueDateISO = newDate ? newDate.toISOString() : null;

    // Optimistic UI Update
    const originalTasks = [...tasks];
    const updatedTasksOptimistic = tasks.map(task =>
      task.id === taskId ? { ...task, due_date: newDueDateISO } : task
    );
    setTasks(updatedTasksOptimistic);
    toast.info('Atualizando data de vencimento...');

    try {
      // Usar o formato que o backend espera (dueDate em vez de due_date)
      const updateData = { dueDate: newDueDateISO };
      await updateTask({ id: taskId, data: updateData });
      toast.success('Data de vencimento atualizada com sucesso!');

      // Notificar o componente pai sobre a atualização das tarefas
      if (props.onTasksUpdated) {
        await props.onTasksUpdated();
      }
      // fetchTasks(); // Opcional
    } catch (err) {
      console.error('Erro ao atualizar data de vencimento:', err);
      toast.error('Erro ao atualizar data. Revertendo alteração.');
      setTasks(originalTasks); // Reverte
    }
  }, [tasks, updateTask, props.onTasksUpdated]);

  // Manipula a atribuição de um usuário via Popover - memoizado para performance
  const handleAssignUser = useCallback(async (taskId: number, userId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentUsersIds = task.users?.map(user => typeof user === 'object' ? user.id : user) ?? [];

    if (currentUsersIds.includes(userId)) {
      toast.info('Este usuário já está atribuído a esta tarefa.');
      return;
    }

    const newUsersIds = [...currentUsersIds, userId];

    // Optimistic UI Update
    const originalTasks = [...tasks];
    const userToAssign = users[userId] ?
      { id: userId, name: users[userId], email: `user${userId}@example.com` } : // Adiciona email dummy
      { id: userId, name: `Usuário ${userId}`, email: `user${userId}@example.com` };

    const updatedTasksOptimistic = tasks.map(t => {
      if (t.id === taskId) {
        const updatedUsersArray = Array.isArray(t.users) ? [...t.users] : [];
        updatedUsersArray.push(userToAssign);
        return { ...t, users: updatedUsersArray };
      }
      return t;
    });
    setTasks(updatedTasksOptimistic);
    toast.info(`Atribuindo usuário ${userToAssign.name}...`);


    try {
      await updateTask({ id: taskId, data: { users: newUsersIds } });
      toast.success('Usuário atribuído com sucesso!');

      // Notificar o componente pai sobre a atualização das tarefas
      if (props.onTasksUpdated) {
        await props.onTasksUpdated();
      }
      // fetchTasks(); // Opcional
    } catch (err) {
      console.error('Erro ao atribuir usuário:', err);
      toast.error('Erro ao atribuir usuário. Revertendo alteração.');
      setTasks(originalTasks); // Reverte
    }
  }, [tasks, users, updateTask, props.onTasksUpdated]);

  // Manipula a remoção de um usuário via Popover - memoizado para performance
  const handleRemoveUser = useCallback(async (taskId: number, userId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentUsersIds = task.users?.map(user => typeof user === 'object' ? user.id : user) ?? [];
    const newUsersIds = currentUsersIds.filter(id => id !== userId);
    const userName = users[userId] ?? `Usuário ${userId}`;

    // Optimistic UI Update
    const originalTasks = [...tasks];
    const updatedTasksOptimistic = tasks.map(t => {
      if (t.id === taskId) {
        const updatedUsersArray = t.users?.filter(user => (typeof user === 'object' ? user.id : user) !== userId) ?? [];
        return { ...t, users: updatedUsersArray };
      }
      return t;
    });
    setTasks(updatedTasksOptimistic);
    toast.info(`Removendo usuário ${userName}...`);

    try {
      await updateTask({ id: taskId, data: { users: newUsersIds } });
      toast.success('Usuário removido com sucesso!');

      // Notificar o componente pai sobre a atualização das tarefas
      if (props.onTasksUpdated) {
        await props.onTasksUpdated();
      }
      // fetchTasks(); // Opcional
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      toast.error('Erro ao remover usuário. Revertendo alteração.');
      setTasks(originalTasks); // Reverte
    }
  }, [tasks, users, updateTask, props.onTasksUpdated]);

  // Abre o modal de detalhes da tarefa - memoizado para performance
  const handleTaskClick = useCallback((taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  }, []);

  // Fecha o modal de detalhes da tarefa - memoizado para performance
  const handleTaskModalClose = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTaskId(null);
  }, []);

  // Chamado quando uma tarefa é atualizada dentro do modal
  const handleTaskUpdated = async () => {
    // Notificar o componente pai sobre a atualização das tarefas
    if (props.onTasksUpdated) {
      await props.onTasksUpdated();
    }

    // As tarefas serão atualizadas automaticamente via React Query
    handleTaskModalClose(); // Fecha o modal
  };

  // Manipula a exclusão da tarefa (chamado pelo Dialog de confirmação)
  const handleDeleteTask = async () => {
    if (selectedTaskId === null) return;

    const taskToDelete = tasks.find(t => t.id === selectedTaskId);
    if (!taskToDelete) {
        toast.error("Tarefa selecionada para exclusão não encontrada.");
        setIsDeleteDialogOpen(false);
        setSelectedTaskId(null);
        return;
    }

    const taskIdToDelete = selectedTaskId;
    toast.info(`Excluindo tarefa "${taskToDelete.title}"...`);
    setIsDeleteDialogOpen(false);

    // Optimistic UI Update
    const originalTasks = [...tasks];
    const updatedTasksOptimistic = tasks.filter(task => task.id !== taskIdToDelete);
    setTasks(updatedTasksOptimistic);


    try {
      await deleteTaskMutation(taskIdToDelete);
      toast.success('Tarefa excluída com sucesso!');
      setSelectedTaskId(null);

      // Notificar o componente pai sobre a atualização das tarefas
      if (props.onTasksUpdated) {
        await props.onTasksUpdated();
      }
      // fetchTasks(); // Desnecessário com optimistic update
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      toast.error('Erro ao excluir tarefa. Restaurando tarefa na lista.');
      setTasks(originalTasks); // Restaura
    }
  };

  // Abre o diálogo de confirmação de exclusão
  const openDeleteConfirmation = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDeleteDialogOpen(true);
  };


  // --- Funções de Agrupamento e Renderização ---

  // Agrupa tarefas por data (Atrasadas, Hoje, Amanhã, Futuro, Sem Data)
  const groupTasksByDate = (tasksToGroup: Task[]) => {
    // console.log('Agrupando tarefas por data. Total:', tasksToGroup.length);

    const groups: Record<'overdue' | 'today' | 'tomorrow' | 'future' | 'no_date', Task[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      future: [],
      no_date: [],
    };

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0];

    // console.log(`Hoje: ${todayDateStr}, Amanhã: ${tomorrowDateStr}`);

    tasksToGroup.forEach(task => {
      if (!task.due_date) {
        // console.log(`Tarefa ${task.id} sem data`);
        groups.no_date.push(task);
        return;
      }

      try {
        const taskDate = new Date(task.due_date);
        if (isNaN(taskDate.getTime())) {
          // console.log(`Tarefa ${task.id} com data inválida: ${task.due_date}`);
          groups.no_date.push(task);
          return;
        }

        const taskDateStr = taskDate.toISOString().split('T')[0];
        // console.log(`Tarefa ${task.id}: Data processada: ${taskDateStr}`);

        if (taskDateStr < todayDateStr) {
          // console.log(`Tarefa ${task.id} ATRASADA`);
          groups.overdue.push(task);
        } else if (taskDateStr === todayDateStr) {
          // console.log(`Tarefa ${task.id} para HOJE`);
          groups.today.push(task);
        } else if (taskDateStr === tomorrowDateStr) {
          // console.log(`Tarefa ${task.id} para AMANHÃ`);
          groups.tomorrow.push(task);
        } else {
          // console.log(`Tarefa ${task.id} para o FUTURO`);
          groups.future.push(task);
        }
      } catch (e) {
        console.error("Erro ao processar data da tarefa:", task.id, task.due_date, e);
        groups.no_date.push(task);
      }
    });

    // Ordena tarefas dentro dos grupos (opcional, mas bom para consistência)
    const sortByDateAsc = (a: Task, b: Task) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dateA - dateB;
    };
    const sortByDateDesc = (a: Task, b: Task) => { // Para atrasadas, mais antigas primeiro
        const dateA = a.due_date ? new Date(a.due_date).getTime() : -Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : -Infinity;
        return dateA - dateB;
    };

    groups.future.sort(sortByDateAsc);
    groups.overdue.sort(sortByDateDesc);
    // groups.today.sort(sortByDateAsc); // Pode ordenar por outro critério se quiser
    // groups.tomorrow.sort(sortByDateAsc);

    // console.log('Resultado do agrupamento:', {
    //   atrasadas: groups.overdue.length,
    //   hoje: groups.today.length,
    //   amanha: groups.tomorrow.length,
    //   futuras: groups.future.length,
    //   sem_data: groups.no_date.length
    // });

    return groups;
  };

  // Componente interno para renderizar uma seção de tarefas
  const TasksSection = ({ title, tasksToRender, color, showProjectColumn = showProject ?? !projectId }: { title?: string, tasksToRender: Task[], color?: string, showProjectColumn?: boolean }) => {
    // Sempre renderiza seções com título, mesmo que estejam vazias (para viewMode=date)
    if (tasksToRender.length === 0 && !title) return null; // Não renderiza seção vazia se for a lista geral

    let headerBgColor = 'bg-gray-100 dark:bg-gray-800';
    let headerTextColor = 'text-gray-800 dark:text-gray-200';

    switch (color) {
      case 'red':
        headerBgColor = 'bg-red-100 dark:bg-red-900/30';
        headerTextColor = 'text-red-800 dark:text-red-200';
        break;
      case 'blue':
         headerBgColor = 'bg-blue-100 dark:bg-blue-900/30';
         headerTextColor = 'text-blue-800 dark:text-blue-200';
         break;
      case 'green':
         headerBgColor = 'bg-green-100 dark:bg-green-900/30';
         headerTextColor = 'text-green-800 dark:text-green-200';
         break;
      case 'purple':
         headerBgColor = 'bg-purple-100 dark:bg-purple-900/30';
         headerTextColor = 'text-purple-800 dark:text-purple-200';
         break;
       case 'gray':
         headerBgColor = 'bg-gray-200 dark:bg-gray-700';
         headerTextColor = 'text-gray-700 dark:text-gray-300';
         break;
    }

    return (
      <div className="mb-8">
        {title && (
          <div className={`flex items-center gap-2 mb-4 p-2 rounded-md ${headerBgColor} ${headerTextColor}`}>
            <h3 className="text-lg font-medium">{title}</h3>
            <span className="text-sm">({tasksToRender.length})</span>
          </div>
        )}
        {tasksToRender.length === 0 && title && (
             <div className="text-center text-muted-foreground py-4 italic text-sm">Nenhuma tarefa nesta categoria</div>
        )}
        {tasksToRender.length > 0 && (
            <Table>
            <TableHeader>
                <TableRow>
                <SortableHeader field="title">Tarefa</SortableHeader>
                {showProjectColumn && <SortableHeader field="project">Projeto</SortableHeader>}
                <SortableHeader field="assignee">Responsável</SortableHeader>
                <SortableHeader field="priority">Prioridade</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="date">Data</SortableHeader>
                <TableHead>Tempo</TableHead>
                <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasksToRender.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/50">
                    {/* Célula Título */}
                    <TableCell className="font-medium max-w-[250px] truncate">
                    <button
                        onClick={() => handleTaskClick(task.id)}
                        className="hover:text-primary transition-colors text-left w-full truncate"
                        title={task.title && task.title.includes('autentica') && task.title.includes('autoriza') ?
                            task.title.replace(/autentica..o/g, 'autenticação').replace(/autoriza..o/g, 'autorização') :
                            decodeText(task.title)}
                    >
                        {(() => {
                            if (task.title && task.title.includes('autentica')) {

                                // Solução direta para qualquer texto que contenha "autentica" e "autoriza"
                                if (task.title.includes('autentica') && task.title.includes('autoriza')) {
                                    return task.title
                                        .replace(/autentica..o/g, 'autenticação')
                                        .replace(/autoriza..o/g, 'autorização');
                                }
                            }
                            return decodeText(task.title);
                        })()}
                    </button>
                    </TableCell>

                    {/* Célula Projeto */}
                    {showProjectColumn && (
                        <TableCell className="max-w-[150px] truncate" title={decodeText(projects[task.project_id])}>
                            {decodeText(projects[task.project_id]) || `Projeto ${task.project_id}`}
                        </TableCell>
                    )}

                    {/* Célula Responsável */}
                    <TableCell className="max-w-[150px] truncate">
                    <Popover>
                        <PopoverTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-foreground truncate" title={task.users?.map(u => typeof u === 'object' ? decodeText(u.name) : decodeText(users[u]) ?? `Usuário ${u}`).join(', ') ?? 'Não atribuído'}>
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">
                                {task.users && task.users.length > 0
                                ? task.users.map(user => {
                                    const userId = typeof user === 'object' ? user.id : user;
                                    const userName = typeof user === 'object' ? decodeText(user.name) : decodeText(users[userId]);
                                    return userName || `Usuário ${userId}`;
                                    }).join(', ')
                                : <span className="text-muted-foreground italic">Não atribuído</span>}
                            </span>
                        </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-3 border-b">
                            <div className="text-sm font-medium">Responsáveis</div>
                            <div className="text-xs text-muted-foreground">Gerenciar responsáveis</div>
                        </div>
                        <div className="p-3 max-h-60 overflow-y-auto">
                            {task.users && task.users.length > 0 ? (
                            <div className="space-y-2 mb-3">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Atribuídos</div>
                                {task.users.map(user => {
                                const userId = typeof user === 'object' ? user.id : user;
                                const userName = typeof user === 'object' ? decodeText(user.name) : decodeText(users[userId]) || `Usuário ${userId}`;
                                return (
                                    <div key={userId} className="flex items-center justify-between text-sm">
                                    <span className="truncate" title={userName}>{userName}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                                        onClick={() => handleRemoveUser(task.id, userId)}
                                        title={`Remover ${userName}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5"/>
                                    </Button>
                                    </div>
                                );
                                })}
                            </div>
                            ) : (
                            <div className="text-sm text-muted-foreground mb-3 italic">Nenhum responsável</div>
                            )}
                            <div className="text-xs font-medium text-muted-foreground mb-1 pt-2 border-t">Adicionar</div>
                            <div className="space-y-1">
                            {Object.entries(users)
                                    .filter(([id]) => !(task.users?.some(u => (typeof u === 'object' ? u.id : u) === parseInt(id))))
                                    .map(([id, name]) => (
                                        <Button
                                            key={id}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-sm h-8"
                                            onClick={() => handleAssignUser(task.id, parseInt(id))}
                                        >
                                            <User className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                                            <span className="truncate">{decodeText(name)}</span>
                                        </Button>
                                    )
                            )}
                            {Object.keys(users).length === task.users?.length && Object.keys(users).length > 0 && (
                                <div className="text-xs text-muted-foreground italic text-center py-1">Todos usuários atribuídos</div>
                            )}
                            {Object.keys(users).length === 0 && (
                                <div className="text-xs text-muted-foreground italic text-center py-1">Nenhum usuário disponível</div>
                            )}
                            </div>
                        </div>
                        </PopoverContent>
                    </Popover>
                    </TableCell>

                    {/* Célula Prioridade */}
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md">
                          <Badge
                              variant={getPriorityColor(task.priority)}
                              className="cursor-pointer hover:opacity-80"
                          >
                              {getPriorityLabel(task.priority)}
                          </Badge>
                        </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Alterar prioridade</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(['baixa', 'media', 'alta', 'urgente'] as TaskPriority[]).map(p => (
                            <DropdownMenuItem key={p} onClick={() => handlePriorityChange(task.id, p)} disabled={task.priority === p}>
                            <Badge variant={getPriorityColor(p)} className="mr-2 w-16 justify-center">{getPriorityLabel(p)}</Badge>
                            </DropdownMenuItem>
                        ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>

                    {/* Célula Status */}
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md">
                          <Badge
                              variant={getStatusColor(task.status)}
                              className="cursor-pointer hover:opacity-80"
                          >
                              {getStatusLabel(task.status)}
                          </Badge>
                        </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(['a_fazer', 'em_andamento', 'em_revisao', 'aguardando_cliente', 'concluido', 'cancelado'] as TaskStatus[]).map(s => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(task.id, s)} disabled={task.status === s}>
                            <Badge variant={getStatusColor(s)} className="mr-2 w-28 justify-center">{getStatusLabel(s)}</Badge>
                            </DropdownMenuItem>
                        ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>

                    {/* Célula Data */}
                    <TableCell>
                    <Popover>
                        <PopoverTrigger asChild>
                        <div className={cn(
                            "flex items-center gap-2 text-sm cursor-pointer hover:text-foreground",
                            task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && task.status !== 'concluido' ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground" // Destaca datas passadas (não concluídas)
                        )}>
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            {formatDate(task.due_date)}
                        </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b">
                            <div className="text-sm font-medium">Data de vencimento</div>
                            <div className="text-xs text-muted-foreground">Selecione uma nova data</div>
                        </div>
                        <CalendarComponent
                            mode="single"
                            selected={task.due_date ? new Date(task.due_date) : undefined}
                            onSelect={(date) => handleDueDateChange(task.id, date)}
                            initialFocus
                            locale={ptBR}
                            // disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} // Permite selecionar datas passadas se necessário
                        />
                        <div className="p-3 border-t flex justify-end">
                            <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDueDateChange(task.id, undefined)}
                            disabled={!task.due_date}
                            >
                            Remover data
                            </Button>
                        </div>
                        </PopoverContent>
                    </Popover>
                    </TableCell>

                    {/* Célula Temporizador */}
                    <TableCell>
                      <TaskTimer
                        taskId={String(task.id)}
                        initialTime={task.timer || 0}
                        isRunning={timerRunningTaskId === String(task.id)}
                        disabled={true} // TEMPORIZADOR DESABILITADO - não é prioridade corrigir bugs
                        onStatusChange={(status) => {
                          // TEMPORIZADOR DESABILITADO - não iniciar timer automaticamente
                          // Atualizar o estado do timer em execução
                          // if (status === "Em Andamento") {
                          //   setTimerRunningTaskId(String(task.id));
                          // } else {
                          //   setTimerRunningTaskId(null);
                          // }

                          // Atualizar o status da tarefa quando o temporizador é iniciado/pausado
                          const apiStatus = status === "Em Andamento" ? "em_andamento" : "a_fazer";
                          if (task.status !== apiStatus) {
                            // Atualizar o status da tarefa na API
                            handleStatusChange(task.id, apiStatus);
                          }
                        }}
                        onTimerUpdate={(seconds) => {
                          // Atualizar o timer no backend quando o temporizador é pausado

                          // Garantir que o valor seja um número válido
                          const timerValue = Number(seconds);

                          if (isNaN(timerValue)) {
                            console.error('TasksList: Erro ao converter timer para número:', seconds);
                            toast.error('Erro ao processar o tempo. Usando valor padrão.');
                            return; // Não prosseguir com a atualização
                          }


                          // Obter o valor atual do timer da tarefa (pode ser 0 se não existir)
                          const currentTimer = task.timer || 0;

                          // Usar o valor recebido do componente TaskTimer
                          // Este valor já representa o tempo total acumulado
                          const newTimerValue = timerValue;

                          // Atualização otimista do estado local
                          const originalTasks = [...tasks];
                          const updatedTasksOptimistic = tasks.map(t =>
                            t.id === task.id ? { ...t, timer: newTimerValue } : t
                          );
                          setTasks(updatedTasksOptimistic);

                          // Criar objeto de atualização explicitamente
                          const updateData = {
                            timer: newTimerValue
                          };


                          // Mostrar toast de informação
                          toast.info('Atualizando tempo da tarefa...');

                          updateTask({ id: task.id, data: updateData })
                            .then(() => {
                              toast.success('Tempo da tarefa atualizado com sucesso!');
                            })
                            .catch(err => {
                              console.error('Erro ao atualizar timer da tarefa:', err);
                              toast.error('Erro ao atualizar timer. Revertendo alteração.');
                              setTasks(originalTasks); // Reverte em caso de erro
                            });
                        }}
                      />
                    </TableCell>

                    {/* Célula Ações */}
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleTaskClick(task.id)}>
                            {permissions.isMember ? (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>Ver Detalhes</span>
                              </>
                            ) : (
                              <>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Ver / Editar</span>
                              </>
                            )}
                        </DropdownMenuItem>
                        {!permissions.isMember && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => openDeleteConfirmation(task.id)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                            </DropdownMenuItem>
                          </>
                        )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        )}
      </div>
    );
  };

  // --- Renderização Principal do Componente ---
  return (
    <div className="w-full space-y-4">
        {/* Indicador de Erro */}
        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {/* Esqueleto de Carregamento */}
        {loading && (
            <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-1/3 mb-4" />
                {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4 border-b pb-2 mb-2">
                    <Skeleton className="h-5 flex-1" />
                    { !projectId && <Skeleton className="h-5 w-24" />}
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-8" />
                </div>
                ))}
            </div>
        )}

        {/* Conteúdo Principal (Lista de Tarefas) */}
        {!loading && !error && (
            <>
                {tasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-16">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Nenhuma tarefa encontrada</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {projectId ? 'Não há tarefas neste projeto.' : (selectedTeamId ? 'Não há tarefas para esta equipe.' : 'Comece adicionando uma nova tarefa.')}
                        </p>
                    </div>
                ) : (
                    <div>
                        {viewMode === 'date' ? (
                            <div className="space-y-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <h2 className="text-xl font-semibold">Tarefas por Data</h2>
                                    <Badge variant="outline">{tasks.length} tarefas</Badge>
                                </div>
                                {(() => {
                                    // console.log('Renderizando modo data');
                                    const groups = groupTasksByDate(tasks);
                                    const hasAnyTasks = Object.values(groups).some(group => group.length > 0);

                                    if (!hasAnyTasks) {
                                        return (
                                            <div className="text-center text-muted-foreground py-8">
                                                Nenhuma tarefa encontrada para os filtros selecionados.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-8">
                                            {/* Sempre renderiza todas as seções, mesmo que estejam vazias */}
                                            <TasksSection title="Atrasadas" tasksToRender={sortGroup(groups.overdue)} color="red" />
                                            <TasksSection title="Hoje" tasksToRender={sortGroup(groups.today)} color="blue" />
                                            <TasksSection title="Amanhã" tasksToRender={sortGroup(groups.tomorrow)} color="green" />
                                            <TasksSection title="Próximas" tasksToRender={sortGroup(groups.future)} color="purple" />
                                            <TasksSection title="Sem Data" tasksToRender={sortGroup(groups.no_date)} color="gray" />
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            // Renderização por Status (ou padrão)
                            <TasksSection tasksToRender={sortedTasks} /> // Renderiza todas as tarefas ordenadas
                        )}
                    </div>
                )}
            </>
        )}

        {/* --- Modais e Diálogos (Renderizados fora do fluxo principal) --- */}

        {/* Modal de Detalhes da Tarefa */}
        {selectedTaskId && (
            <TaskDetailsModal
                taskId={selectedTaskId}
                isOpen={isTaskModalOpen}
                onClose={handleTaskModalClose}
                onTaskUpdated={handleTaskUpdated}
                timerRunningTaskId={timerRunningTaskId}
            />
        )}

        {/* Diálogo de Confirmação de Exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir a tarefa{' '}
                        <span className="font-semibold">
                            "{decodeText(tasks.find(t => t.id === selectedTaskId)?.title) ?? 'selecionada'}"
                        </span>
                        ? Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteTask}>
                        Excluir Tarefa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div> // Fecha o div principal do componente
  ); // Fecha o parêntese do return
}); // Fecha a chamada do forwardRef e a definição do componente TasksList

// Opcional: Definir um nome de exibição para o componente para facilitar a depuração
TasksList.displayName = 'TasksList';