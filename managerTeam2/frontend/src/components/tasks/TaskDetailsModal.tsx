import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  ThumbsUp,
  Send,
  History,
  Tag,
  User,
  Briefcase,
  Users,
  ListOrdered
} from 'lucide-react';
import { TaskForm } from '@/components/forms/TaskForm';
import { format, isPast, isBefore, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task, TaskPriority, userService, teamService, projectService } from '@/lib/api';
import taskService, { convertApiTaskToFrontend } from '@/lib/api/tasks';

interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface TaskHistoryItem {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

type ActivityItem = TaskComment | TaskHistoryItem & { type: 'comment' | 'history' };

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  onTaskUpdated: () => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado para o modo de edição inline
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('all');
  const [mentionedUsers, setMentionedUsers] = useState<number[]>([]);
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Estado para controlar o modo de edição inline
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails(taskId);
      // Resetar o modo de edição quando o modal é aberto
      setIsEditMode(false);
      setEditedTask({});
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${id}`);
      }

      console.log(`Carregando detalhes da tarefa com ID: ${taskId} (tipo: ${typeof taskId})`);

      // Carregar detalhes da tarefa
      const taskData = await taskService.getTask(taskId);

      // Converter os nomes dos campos da API para o formato usado no frontend
      const completeTaskData = convertApiTaskToFrontend(taskData);

      console.log('Tarefa completa:', completeTaskData);

      setTask(completeTaskData);

      // Carregar usuários para exibição de comentários e menções
      try {
        const usersData = await userService.getUsers();
        setUsers(usersData);
      } catch (userErr) {
        console.error('Erro ao carregar usuários:', userErr);
      }

      // Carregar equipes (occupações)
      try {
        const teamsData = await teamService.getTeams();
        setTeams(teamsData);
      } catch (teamsErr) {
        console.error('Erro ao carregar equipes:', teamsErr);
      }

      // Carregar projetos
      try {
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
      } catch (projectsErr) {
        console.error('Erro ao carregar projetos:', projectsErr);
      }

      // Carregar comentários (simulação - substituir pela API real quando disponível)
      // Na implementação real, você usaria algo como:
      // const commentsData = await taskService.getTaskComments(id);
      const mockComments: TaskComment[] = [
        {
          id: 1,
          task_id: id,
          user_id: 1,
          content: 'Favor concluir esta tarefa até o final da semana.',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 dias atrás
          updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          user: {
            id: 1,
            name: 'José Inácio',
            email: 'jose@example.com'
          }
        },
        {
          id: 2,
          task_id: id,
          user_id: 2,
          content: 'Atualizar a situação da tarefa para Em Andamento.',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          user: {
            id: 2,
            name: 'Rafael Santos',
            email: 'rafael@example.com'
          }
        }
      ];
      setComments(mockComments);

      // Carregar histórico (simulação - substituir pela API real quando disponível)
      const mockHistory: TaskHistoryItem[] = [
        {
          id: 1,
          task_id: id,
          user_id: 3,
          action: 'status_changed',
          field: 'status',
          old_value: 'a_fazer',
          new_value: 'em_andamento',
          created_at: new Date(Date.now() - 86400000 * 1.5).toISOString(), // 1.5 dias atrás
          user: {
            id: 3,
            name: 'Eric Nunes',
            email: 'eric@example.com'
          }
        },
        {
          id: 2,
          task_id: id,
          user_id: 2,
          action: 'due_date_changed',
          field: 'due_date',
          old_value: '2023-09-15',
          new_value: '2023-09-20',
          created_at: new Date(Date.now() - 86400000 * 0.5).toISOString(), // 0.5 dias atrás
          user: {
            id: 2,
            name: 'Rafael Santos',
            email: 'rafael@example.com'
          }
        }
      ];
      setHistory(mockHistory);
    } catch (err) {
      console.error('Erro ao carregar detalhes da tarefa:', err);
      setError('Não foi possível carregar os detalhes da tarefa. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar o modo de edição
  const startEditMode = () => {
    if (!task) return;

    // Inicializar o estado editedTask com os valores atuais da tarefa
    // Verificar se as datas são válidas antes de adicioná-las ao estado
    const editData: Partial<Task> = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      order: task.order,
      users: task.users,
      occupations: task.occupations
    };

    // Tratar o project_id com cuidado especial
    if (task.project_id !== undefined) {
      editData.project_id = task.project_id;
    } else if (task.project?.id !== undefined) {
      editData.project_id = task.project.id;
    }

    // Adicionar datas apenas se forem válidas
    if (isValidDate(task.start_date)) {
      editData.start_date = task.start_date;
    }

    if (isValidDate(task.due_date)) {
      editData.due_date = task.due_date;
    }

    setEditedTask(editData);
    setIsEditMode(true);
  };

  // Cancelar o modo de edição
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditedTask({});
  };

  // Atualizar um campo específico no estado editedTask
  const handleFieldChange = (field: keyof Task, value: any) => {
    // Tratamento especial para campos de data
    if (field === 'start_date' || field === 'due_date') {
      // Se o valor for uma string vazia, definir como null para indicar que a data foi removida
      if (value === '') {
        console.log(`Definindo ${field} como null (data removida)`);
        setEditedTask(prev => ({
          ...prev,
          [field]: null
        }));
        return;
      }

      // Se o valor for uma string de data válida (formato YYYY-MM-DD do input type="date")
      if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Converter para formato ISO para armazenar no estado
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          console.log(`Definindo ${field} como ${date.toISOString()} (data válida)`);
          setEditedTask(prev => ({
            ...prev,
            [field]: date.toISOString()
          }));
          return;
        }
      }
    }

    // Para outros campos, atualizar normalmente
    console.log(`Definindo ${field} como ${value} (campo normal)`);
    setEditedTask(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Salvar as alterações feitas no modo de edição
  const saveChanges = async () => {
    if (!task) return;

    try {
      console.log('Atualizando tarefa ID:', task.id, 'com dados:', editedTask);
      console.log('Datas originais - start_date:', task.start_date, 'due_date:', task.due_date);
      console.log('Datas editadas - start_date:', editedTask.start_date, 'due_date:', editedTask.due_date);

      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(task.id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${task.id}`);
      }

      // Verificar se estamos atualizando apenas datas
      const isDateOnlyUpdate = Object.keys(editedTask).every(key =>
        ['start_date', 'due_date'].includes(key)
      );

      let taskData;

      if (isDateOnlyUpdate) {
        // Para atualizações apenas de datas, enviar apenas os campos modificados
        taskData = {
          startDate: editedTask.start_date ? new Date(editedTask.start_date).toISOString() : undefined,
          dueDate: editedTask.due_date ? new Date(editedTask.due_date).toISOString() : undefined
        };
        console.log('Atualizando apenas datas com PATCH:', taskData);
      } else {
        // Para atualizações completas, usar a função prepareTaskDataForApi
        taskData = prepareTaskDataForApi(task, editedTask);
        console.log('Atualizando todos os campos com PUT:', taskData);
      }

      // Logs detalhados para depuração
      console.log('Task original:', task);
      console.log('Campos editados:', editedTask);
      console.log('Dados preparados:', taskData);

      // Enviar a requisição para a API
      const updatedTask = await taskService.updateTask(taskId, taskData);
      console.log('Resposta da API:', updatedTask);
      console.log('Datas na resposta - startDate:', updatedTask.startDate, 'dueDate:', updatedTask.dueDate);

      // Converter os nomes dos campos da API para o formato usado no frontend
      const preservedTask = {
        ...convertApiTaskToFrontend(updatedTask),
        // Preservar o objeto project se não estiver presente na resposta
        project: updatedTask.project || task.project
      };

      console.log('Tarefa preservada:', preservedTask);
      console.log('Datas preservadas - start_date:', preservedTask.start_date, 'due_date:', preservedTask.due_date);

      setTask(preservedTask);
      setIsEditMode(false);
      setEditedTask({});
      toast.success('Tarefa atualizada com sucesso!');
      onTaskUpdated();
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      toast.error('Erro ao atualizar tarefa. Tente novamente.');
    }
  };



  const handleDeleteTask = async () => {
    if (!task) return;

    try {
      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(task.id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${task.id}`);
      }

      console.log(`Excluindo tarefa com ID: ${taskId} (tipo: ${typeof taskId})`);
      await taskService.deleteTask(taskId);
      setIsDeleteDialogOpen(false);
      onClose();
      toast.success('Tarefa excluída com sucesso!');
      onTaskUpdated();
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      toast.error('Erro ao excluir tarefa. Tente novamente.');
    }
  };

  const handleToggleComplete = async () => {
    if (!task) return;

    try {
      const newStatus = task.status === 'concluido' ? 'a_fazer' : 'concluido';

      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(task.id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${task.id}`);
      }

      // Para atualização apenas de status, enviar apenas o campo status
      // Isso fará com que o serviço use PATCH em vez de PUT
      const taskData = { status: newStatus };

      console.log('Atualizando status da tarefa ID:', task.id, 'para:', newStatus);
      console.log('Dados para envio:', taskData);
      console.log(`Atualizando status da tarefa com ID: ${taskId} (tipo: ${typeof taskId})`);

      // Enviar a requisição para a API
      const updatedTask = await taskService.updateTask(taskId, taskData);
      console.log('Resposta da API:', updatedTask);

      // Converter os nomes dos campos da API para o formato usado no frontend
      const preservedTask = {
        ...convertApiTaskToFrontend(updatedTask),
        // Preservar o objeto project se não estiver presente na resposta
        project: updatedTask.project || task.project
      };

      console.log('Tarefa preservada (toggle):', preservedTask);

      setTask(preservedTask);
      toast.success(
        newStatus === 'concluido'
          ? 'Tarefa marcada como concluída!'
          : 'Tarefa marcada como pendente!'
      );
      onTaskUpdated();
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa:', err);
      toast.error('Erro ao atualizar status da tarefa. Tente novamente.');
    }
  };

  const handleAddComment = () => {
    if (!comment.trim() || !task) return;

    // Simulação de adição de comentário (substituir pela API real quando disponível)
    // Na implementação real, você usaria algo como:
    // await taskService.addTaskComment(task.id, { content: comment, mentioned_users: mentionedUsers });

    const newComment: TaskComment = {
      id: Date.now(),
      task_id: task.id,
      user_id: 3, // Simulando o usuário atual como Eric Nunes
      content: comment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: 3,
        name: 'Eric Nunes',
        email: 'eric@example.com'
      }
    };

    setComments([...comments, newComment]);
    setComment('');
    setMentionedUsers([]);
    toast.success('Comentário adicionado com sucesso!');
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);

    // Verificar se o usuário está digitando uma menção (@)
    const lastAtSymbolIndex = value.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1 && lastAtSymbolIndex > value.lastIndexOf(' ')) {
      const query = value.substring(lastAtSymbolIndex + 1).toLowerCase();
      setMentionQuery(query);
      setShowMentionsList(true);
    } else {
      setShowMentionsList(false);
    }
  };

  const handleMentionUser = (user: any) => {
    // Substituir o texto após o @ pelo nome do usuário
    const lastAtSymbolIndex = comment.lastIndexOf('@');
    const newComment = comment.substring(0, lastAtSymbolIndex) + `@${user.name} `;
    setComment(newComment);
    setShowMentionsList(false);

    // Adicionar o usuário à lista de mencionados
    if (!mentionedUsers.includes(user.id)) {
      setMentionedUsers([...mentionedUsers, user.id]);
    }
  };

  const getFilteredUsers = () => {
    if (!mentionQuery) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(mentionQuery) ||
      user.email.toLowerCase().includes(mentionQuery)
    );
  };

  // Formatar o conteúdo do comentário para destacar menções
  const formatCommentContent = (content: string) => {
    // Substituir @mentions por spans estilizados
    const formattedContent = content.replace(/@([\w\s]+)/g, '<span class="text-primary font-medium">@$1</span>');
    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  // Obter todos os itens de atividade ordenados por data
  const getActivityItems = () => {
    let items: (TaskComment | TaskHistoryItem & { type: 'comment' | 'history' })[] = [];

    // Adicionar comentários
    if (activityTab === 'all' || activityTab === 'comments') {
      items = [...items, ...comments.map(comment => ({ ...comment, type: 'comment' as const }))];
    }

    // Adicionar histórico
    if (activityTab === 'all' || activityTab === 'history') {
      items = [...items, ...history.map(item => ({ ...item, type: 'history' as const }))];
    }

    // Ordenar por data (mais recente primeiro)
    return items.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  // Formatar a mensagem de histórico
  const formatHistoryMessage = (item: TaskHistoryItem) => {
    switch (item.action) {
      case 'status_changed':
        return (
          <span>
            alterou o status de <span className="font-medium">{getStatusLabel(item.old_value)}</span> para <span className="font-medium">{getStatusLabel(item.new_value)}</span>
          </span>
        );
      case 'priority_changed':
        return (
          <span>
            alterou a prioridade de <span className="font-medium">{getPriorityLabel(item.old_value)}</span> para <span className="font-medium">{getPriorityLabel(item.new_value)}</span>
          </span>
        );
      case 'due_date_changed':
        return (
          <span>
            alterou a data final de <span className="font-medium">{formatDate(item.old_value)}</span> para <span className="font-medium">{formatDate(item.new_value)}</span>
          </span>
        );
      case 'assignee_added':
        return <span>adicionou <span className="font-medium">{item.new_value}</span> como responsável</span>;
      case 'assignee_removed':
        return <span>removeu <span className="font-medium">{item.old_value}</span> dos responsáveis</span>;
      default:
        return <span>{item.action}</span>;
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      case 'baixa': return 'Baixa';
      case 'urgente': return 'Urgente';
      default: return priority || '';
    }
  };

  // Função auxiliar para verificar se uma data é válida
  const isValidDate = (dateString?: string | Date): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Função para formatar data para exibição
  const formatDate = (dateString?: string) => {
    if (!dateString || !isValidDate(dateString)) return '';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Função para formatar data para input type="date"
  const formatDateForInput = (dateString?: string | Date): string => {
    if (!dateString || !isValidDate(dateString)) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Função para preparar os dados da tarefa para envio à API
  const prepareTaskDataForApi = (baseTask: Task, updatedFields: Partial<Task> = {}): any => {
    // Inicializar com os campos básicos
    const taskData: any = {
      // Campos obrigatórios
      title: updatedFields.title || baseTask.title,
      description: updatedFields.description !== undefined ? updatedFields.description : baseTask.description,
      status: updatedFields.status || baseTask.status,
      priority: updatedFields.priority || baseTask.priority,
    };

    // Tratar o project_id com cuidado especial - usar o formato camelCase para a API
    if (updatedFields.project_id !== undefined) {
      taskData.projectId = Number(updatedFields.project_id);
    } else if (baseTask.project_id !== undefined) {
      taskData.projectId = Number(baseTask.project_id);
    } else if (baseTask.project?.id !== undefined) {
      taskData.projectId = Number(baseTask.project.id);
    }

    // Tratar as datas com cuidado - usar o formato camelCase para a API
    // Verificar se a data de início foi explicitamente definida como null ou undefined
    if (updatedFields.start_date === null || updatedFields.start_date === undefined) {
      // Se a data foi explicitamente definida como null ou undefined no formulário de edição,
      // manter o valor original da tarefa
      if (isValidDate(baseTask.start_date)) {
        const startDate = new Date(baseTask.start_date);
        taskData.startDate = startDate.toISOString();
      }
      // Se não houver data válida na tarefa original, não definir startDate
    } else if (isValidDate(updatedFields.start_date)) {
      // Se uma nova data válida foi fornecida, usar essa data
      const startDate = new Date(updatedFields.start_date);
      taskData.startDate = startDate.toISOString();
    }

    // Verificar se a data de vencimento foi explicitamente definida como null ou undefined
    if (updatedFields.due_date === null || updatedFields.due_date === undefined) {
      // Se a data foi explicitamente definida como null ou undefined no formulário de edição,
      // manter o valor original da tarefa
      if (isValidDate(baseTask.due_date)) {
        const dueDate = new Date(baseTask.due_date);
        taskData.dueDate = dueDate.toISOString();
      }
      // Se não houver data válida na tarefa original, não definir dueDate
    } else if (isValidDate(updatedFields.due_date)) {
      // Se uma nova data válida foi fornecida, usar essa data
      const dueDate = new Date(updatedFields.due_date);
      taskData.dueDate = dueDate.toISOString();
    }

    // Tratar o campo order
    if (updatedFields.order !== undefined) {
      taskData.order = Number(updatedFields.order);
    } else if (baseTask.order !== undefined) {
      taskData.order = Number(baseTask.order);
    } else {
      taskData.order = 0; // Valor padrão
    }

    // Tratar os campos de relacionamentos
    // Converter os usuários para um array de IDs
    if (updatedFields.users) {
      taskData.users = Array.isArray(updatedFields.users)
        ? updatedFields.users.map(u => typeof u === 'number' ? Number(u) : Number(u.id))
        : [];
    } else if (baseTask.users) {
      taskData.users = Array.isArray(baseTask.users)
        ? baseTask.users.map(u => typeof u === 'number' ? Number(u) : Number(u.id))
        : [];
    } else {
      taskData.users = []; // Array vazio como padrão
    }

    // Converter as ocupações para um array de IDs
    if (updatedFields.occupations) {
      taskData.occupations = Array.isArray(updatedFields.occupations)
        ? updatedFields.occupations.map(o => typeof o === 'number' ? Number(o) : Number(o.id))
        : [];
    } else if (baseTask.occupations) {
      taskData.occupations = Array.isArray(baseTask.occupations)
        ? baseTask.occupations.map(o => typeof o === 'number' ? Number(o) : Number(o.id))
        : [];
    } else {
      taskData.occupations = []; // Array vazio como padrão
    }

    // Verificar se todos os campos obrigatórios estão presentes
    // Datas não são obrigatórias para atualizações parciais
    const requiredFields = ['title', 'status', 'priority'];
    const missingFields = requiredFields.filter(field => taskData[field] === undefined);

    if (missingFields.length > 0) {
      console.error('Campos obrigatórios ausentes:', missingFields);
      throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
    }

    return taskData;
  };

  const formatPriority = (priority?: TaskPriority) => {
    switch (priority) {
      case 'alta':
        return { label: 'Alta', variant: "destructive" as const };
      case 'urgente':
        return { label: 'Urgente', variant: "destructive" as const };
      case 'media':
        return { label: 'Média', variant: "default" as const };
      case 'baixa':
        return { label: 'Baixa', variant: "secondary" as const };
      default:
        return { label: 'Média', variant: "default" as const };
    }
  };

  const getDueDateStatus = (dueDate?: string) => {
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

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'a_fazer': return 'A Fazer';
      case 'em_andamento': return 'Em Andamento';
      case 'em_revisao': return 'Em Revisão';
      case 'concluido': return 'Concluído';
      default: return 'Desconhecido';
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'concluido': return 'default';
      case 'em_andamento': return 'secondary';
      case 'em_revisao': return 'warning';
      default: return 'outline';
    }
  };

  const getStatusClass = (status?: string): string => {
    switch (status) {
      case 'pendente': return '';
      case 'a_fazer': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
      case 'em_andamento': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
      case 'em_revisao': return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
      case 'concluido': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
      default: return '';
    }
  };

  const getPriorityClass = (priority?: string): string => {
    switch (priority) {
      case 'baixa': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
      case 'media': return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200';
      case 'alta': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
      case 'urgente': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
      default: return '';
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px]" aria-describedby="loading-description">
          <DialogTitle className="sr-only">Carregando detalhes da tarefa</DialogTitle>
          <div id="loading-description" className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="ml-2">Carregando detalhes da tarefa...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>
              {error}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return null;
  }

  const priorityInfo = formatPriority(task.priority);
  const dueDateStatus = task.due_date ? getDueDateStatus(task.due_date) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden p-0" aria-describedby="task-description">
        <DialogTitle className="sr-only">{task.title}</DialogTitle>
        <div className="flex h-[90vh]">
          {/* Painel Esquerdo - Detalhes da Tarefa */}
          <div className="w-1/2 border-r overflow-y-auto p-6">
            <DialogHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="task-complete"
                      checked={task.status === 'concluido'}
                      onCheckedChange={handleToggleComplete}
                    />
                    {isEditMode ? (
                      <Input
                        value={editedTask.title || task.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className="font-semibold text-lg"
                      />
                    ) : (
                      <DialogTitle className={task.status === 'concluido' ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </DialogTitle>
                    )}

                    <div className="flex gap-1 ml-auto">
                      {isEditMode ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={cancelEditMode}>
                            Cancelar
                          </Button>
                          <Button variant="default" size="sm" className="h-8 px-2" onClick={saveChanges}>
                            Salvar
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={startEditMode}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <DialogContent aria-describedby="delete-description">
                          <DialogHeader>
                            <DialogTitle>Excluir Tarefa</DialogTitle>
                            <DialogDescription id="delete-description">
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
                  <div className="flex items-center gap-2 mt-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <DialogDescription className="m-0">
                      {task.project ? task.project.title : 'Sem projeto associado'}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Descrição */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Descrição</h3>
              {isEditMode ? (
                <Textarea
                  value={editedTask.description !== undefined ? editedTask.description : task.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Adicione uma descrição..."
                />
              ) : (
                <p id="task-description" className="text-sm whitespace-pre-line p-3 border rounded-md bg-muted/30 min-h-[100px]">
                  {task.description || 'Sem descrição.'}
                </p>
              )}
            </div>

            <Separator className="my-4" />

            {/* Detalhes organizados em grid */}
            <div className="space-y-5 mt-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <span className="text-muted-foreground">◉</span>
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Status</div>
                </div>
                <div>
                  {isEditMode ? (
                    <select
                      value={editedTask.status || task.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="border rounded-md px-2 py-1 text-sm">
                      <option value="pendente">Pendente</option>
                      <option value="a_fazer">A Fazer</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="em_revisao">Em Revisão</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  ) : (
                    <Badge variant="outline" className={`rounded-full ${getStatusClass(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Responsáveis */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Responsáveis</div>
                </div>
                {isEditMode ? (
                  <div className="flex-1">
                    <select
                      multiple
                      value={editedTask.users ?
                        (Array.isArray(editedTask.users) ?
                          editedTask.users.map(u => typeof u === 'number' ? u : u.id) :
                          []) :
                        (Array.isArray(task.users) ?
                          task.users.map(u => typeof u === 'number' ? u : u.id) :
                          [])}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                        handleFieldChange('users', selectedOptions);
                      }}
                      className="border rounded-md px-2 py-1 text-sm w-full max-h-24"
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {task.users && task.users.length > 0 ? (
                      task.users.map((user: any) => (
                        <Badge key={typeof user === 'number' ? user : user.id} variant="outline" className="rounded-full">
                          {typeof user === 'number' ?
                            (users.find(u => u.id === user)?.name || `Usuário ${user}`) :
                            user.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhum</span>
                    )}
                  </div>
                )}
              </div>

              {/* Datas */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Datas</div>
                </div>
                {isEditMode ? (
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground">Início</label>
                      <input
                        type="date"
                        value={editedTask.start_date ? formatDateForInput(editedTask.start_date) : formatDateForInput(task.start_date)}
                        onChange={(e) => handleFieldChange('start_date', e.target.value)}
                        className="border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground">Fim</label>
                      <input
                        type="date"
                        value={editedTask.due_date ? formatDateForInput(editedTask.due_date) : task.due_date ? formatDateForInput(task.due_date) : ''}
                        onChange={(e) => handleFieldChange('due_date', e.target.value)}
                        className="border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    {formatDate(task.start_date)}
                    {task.due_date && (
                      <span> → {formatDate(task.due_date)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Tempo estimado (placeholder para futura implementação) */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Tempo estimado</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Vazio
                </div>
              </div>

              {/* Prioridade */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Prioridade</div>
                </div>
                <div>
                  {isEditMode ? (
                    <select
                      value={editedTask.priority || task.priority}
                      onChange={(e) => handleFieldChange('priority', e.target.value)}
                      className="border rounded-md px-2 py-1 text-sm">
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  ) : (
                    <Badge variant="outline" className={`rounded-full ${getPriorityClass(task.priority)}`}>
                      {priorityInfo.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Projeto */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Projeto</div>
                </div>
                <div className="text-sm">
                  {isEditMode ? (
                    <select
                      value={editedTask.project_id !== undefined ? editedTask.project_id : task.project_id}
                      onChange={(e) => handleFieldChange('project_id', parseInt(e.target.value))}
                      className="border rounded-md px-2 py-1 text-sm"
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    task.project ? task.project.title : 'Sem projeto'
                  )}
                </div>
              </div>

              {/* Equipes */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Equipes</div>
                </div>
                {isEditMode ? (
                  <div className="flex-1">
                    <select
                      multiple
                      value={editedTask.occupations ?
                        (Array.isArray(editedTask.occupations) ?
                          editedTask.occupations.map(o => typeof o === 'number' ? o : o.id) :
                          []) :
                        (Array.isArray(task.occupations) ?
                          task.occupations.map(o => typeof o === 'number' ? o : o.id) :
                          [])}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                        handleFieldChange('occupations', selectedOptions);
                      }}
                      className="border rounded-md px-2 py-1 text-sm w-full max-h-24"
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {task.occupations && task.occupations.length > 0 ? (
                      task.occupations.map((occupation: any) => (
                        <Badge key={typeof occupation === 'number' ? occupation : occupation.id} variant="secondary" className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200">
                          {typeof occupation === 'number' ?
                            (teams.find(t => t.id === occupation)?.name || `Equipe ${occupation}`) :
                            occupation.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhuma</span>
                    )}
                  </div>
                )}
              </div>

              {/* Ordem */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Ordem</div>
                </div>
                <div className="text-sm">
                  {isEditMode ? (
                    <input
                      type="number"
                      value={editedTask.order !== undefined ? editedTask.order : task.order || ''}
                      onChange={(e) => handleFieldChange('order', e.target.value ? parseInt(e.target.value) : null)}
                      className="border rounded-md px-2 py-1 text-sm w-20"
                      min="0"
                      placeholder="Ordem"
                    />
                  ) : (
                    task.order !== null ? task.order : 'Não definida'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Painel Direito - Atividade/Comentários */}
          <div className="w-1/2 flex flex-col h-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">Atividade</div>
                <div className="flex gap-1">
                  <Button
                    variant={activityTab === 'all' ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setActivityTab('all')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={activityTab === 'comments' ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setActivityTab('comments')}
                  >
                    Comentários
                  </Button>
                  <Button
                    variant={activityTab === 'history' ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setActivityTab('history')}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Histórico
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista de atividades (com scroll) */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {getActivityItems().length > 0 ? (
                  getActivityItems().map(item => {
                    const isComment = 'content' in item;
                    const date = new Date(item.created_at);
                    const formattedDate = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });

                    return (
                      <div key={`${isComment ? 'comment' : 'history'}-${item.id}`} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {item.user?.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-medium">{item.user?.name}</span>
                              {!isComment && (
                                <span className="text-muted-foreground ml-2 text-sm">
                                  {formatHistoryMessage(item as TaskHistoryItem)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{formattedDate}</span>
                          </div>

                          {isComment && (
                            <div className="mt-1 text-sm">
                              {formatCommentContent((item as TaskComment).content)}
                            </div>
                          )}

                          {/* Ações de comentário */}
                          {isComment && (
                            <div className="flex items-center gap-4 mt-2">
                              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                Curtir
                              </button>
                              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                Responder
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma atividade registrada ainda.</p>
                    <p className="text-sm">Seja o primeiro a comentar!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Área de comentário (fixada na parte inferior) */}
            <div className="p-4 border-t">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    EN
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Textarea
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder="Escreva um comentário... Use @ para mencionar alguém"
                    className="min-h-[80px] pr-12"
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
                    onClick={handleAddComment}
                    disabled={!comment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>

                  {/* Lista de menções */}
                  {showMentionsList && (
                    <div className="absolute bottom-full mb-1 w-full bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto z-10">
                      {getFilteredUsers().length > 0 ? (
                        getFilteredUsers().map(user => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                            onClick={() => handleMentionUser(user)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {user.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">Nenhum usuário encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
