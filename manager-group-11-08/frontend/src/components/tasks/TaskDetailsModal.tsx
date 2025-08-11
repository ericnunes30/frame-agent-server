import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"; // Importar o componente Calendar correto
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  CalendarIcon,
  Clock,
  Copy,
  Edit,
  FileText,
  Heart, // Ícone de coração para curtidas
  History,
  ListOrdered,
  MessageSquare,
  Send,
  Tag,
  ThumbsUp,
  Trash2,
  User,
  Users
} from 'lucide-react';
import { TaskForm } from '@/components/forms/TaskForm';
import { format, isPast, isBefore, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task, TaskPriority, TaskStatus, Comment as ApiComment, User as ApiUser, UpdateTaskRequest } from '@/common/types'; // Importando Comment, User e TaskStatus da API
import { transformApiTaskToFrontend } from '@/utils/apiTransformers';
import { useBackendServices } from '@/hooks/useBackendServices';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import TaskDetailsPopup from '@/components/tasks/TaskDetailsPopup';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import CommentItem from '@/components/comments/CommentItem';
import RichTextEditor from '@/components/ui/RichTextEditor';
import FullScreenEditorModal from '@/components/FullScreenEditorModal'; // Importar o novo modal

// A interface TaskComment local foi removida. Usaremos ApiComment.
interface TaskHistoryItem {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  createdAt: string; // Mudar para camelCase
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

type ActivityItem = ApiComment | TaskHistoryItem & { type: 'comment' | 'history' };

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  onTaskUpdated: () => void;
  timerRunningTaskId?: string; // ID da tarefa com timer em execução
  currentTimerValues?: Record<string, number>; // Valores atuais dos timers
  setCurrentTimerValues?: (values: Record<string, number>) => void; // Função para atualizar os valores dos timers
  setTimerRunningTaskId?: (taskId: string | null) => void; // Função para atualizar o ID da tarefa com timer em execução
  onDuplicateTask?: (task: Task) => void; // Nova prop para duplicar tarefa
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
  timerRunningTaskId,
  currentTimerValues = {},
  setCurrentTimerValues,
  setTimerRunningTaskId,
  onDuplicateTask
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado para o modo de edição inline
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<ApiComment[]>([]); // Usando ApiComment
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [occupations, setOccupations] = useState<any[]>([]);
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('all');
  const [mentionedUsers, setMentionedUsers] = useState<number[]>([]);
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(''); // Reafirmando a declaração
  const { user: authUser } = useAuth(); // Renomeado para authUser para evitar conflito com 'user' em 'newComment.user'
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const permissions = usePermissions();
  const { users: usersService, occupations: occupationsService, projects, tasks, comments: commentsService } = useBackendServices();
  const { data: fetchedTask, refetch: refetchTask } = tasks.useGetTask(taskId);
  const { mutateAsync: updateTask } = tasks.useUpdateTask();
  const { mutateAsync: deleteTaskMutation } = tasks.useDeleteTask();
  const { mutateAsync: createComment } = commentsService.useCreateComment();
  const { data: usersData = [] } = usersService.useGetUsers();
  const { data: occupationsQueryData = [] } = occupationsService.useGetOccupations();
  const { data: projectDetails } = projects.useGetProject(
    task?.project?.id ?? 0,
    Boolean(task?.project?.id),
  );


  useEffect(() => {
    if (projectDetails) {
      setTask(prev => {
        if (!prev || !prev.project) return prev
        if (prev.project.id !== projectDetails.id) return prev
        return { ...prev, project: { ...prev.project, ...projectDetails } }
      })
    }
  }, [projectDetails])

  // Estados para curtidas foram movidos para CommentItem.tsx

  // Estado para controlar o modo de edição inline
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [isFullScreenEditorOpen, setIsFullScreenEditorOpen] = useState(false); // Estado para o modal de tela cheia

  // Efeito para carregar os detalhes da tarefa quando o modal é aberto
  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails(taskId);
      // Resetar o modo de edição quando o modal é aberto
      setIsEditMode(false);
      setEditedTask({});
    }
  }, [isOpen, taskId]); // Apenas para carregar os detalhes da tarefa

  // Efeito separado para notificar quando o modal é fechado
  useEffect(() => {
    // Este efeito só monitora a mudança de isOpen de true para false
    if (!isOpen && task && onTaskUpdated) {
      // Verificar se houve uma mudança real antes de chamar onTaskUpdated
      if (task.updatedAt) { // Verificando se houve uma atualização real
        onTaskUpdated(); // Notificar imediatamente após fechar
      }
    }
  }, [isOpen, task, onTaskUpdated]);

  // Efeito separado para atualizar o timer quando o modal é aberto
  useEffect(() => {
    if (isOpen && taskId && task) {
      // Verificar se o timer está em execução para esta tarefa
      const isTimerRunning = timerRunningTaskId === String(taskId);
      const taskIdStr = String(taskId);

      // Sempre usar o valor mais recente do timer
      // Prioridade: 1. Valor atual no estado global, 2. Valor no estado local da tarefa
      const timerValue = (currentTimerValues && currentTimerValues[taskIdStr]) || task.timer || 0;

      // Atualizar o timer da tarefa no estado local para refletir o valor atual
      // Apenas se o valor for diferente do atual para evitar loops
      if (task.timer !== timerValue) {
        setTask(prev => {
          if (!prev) return null;
          return {
            ...prev,
            timer: timerValue
          };
        });
      }
    }
  }, [isOpen, taskId, task, timerRunningTaskId, currentTimerValues]); // Adicionada dependência em currentTimerValues

  // Estado para controlar se o timer foi pausado manualmente
  const [manuallyPaused, setManuallyPaused] = useState(false);

  // Referências para controlar o timer
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerSyncCounterRef = useRef<number>(0);
  const lastTaskTimerRef = useRef<number | null>(null);

  // Efeito para inicializar o timer quando o modal é aberto
  useEffect(() => {
    if (!isOpen || !taskId || !task) return;

    // Verificar se o timer está em execução para esta tarefa
    const isTimerRunning = timerRunningTaskId === String(taskId);
    const taskIdStr = String(taskId);

    // Limpar qualquer intervalo existente
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Resetar o contador de sincronização
    if (timerSyncCounterRef && timerSyncCounterRef.current !== undefined) {
      timerSyncCounterRef.current = 0;
    }

    // Atualizar a referência do último valor do timer
    if (lastTaskTimerRef && lastTaskTimerRef.current !== undefined) {
      lastTaskTimerRef.current = task.timer || 0;
    }

    // Se o timer estiver em execução, criar um intervalo para atualizar o timer a cada segundo
    if (isTimerRunning) {

      // Resetar o estado de pausa manual quando o timer é iniciado
      setManuallyPaused(false);

      // Usar o valor mais recente do timer
      // Prioridade: 1. Valor atual no estado global, 2. Valor no estado local da tarefa
      const currentValue = (currentTimerValues && currentTimerValues[taskIdStr]) || task.timer || 0;

      // Atualizar o timer da tarefa no estado local apenas se for diferente
      if (task.timer !== currentValue) {
        setTask(prev => {
          if (!prev) return null;
          return {
            ...prev,
            timer: currentValue,
            status: 'em_andamento' // Garantir que o status seja "em_andamento" quando o timer estiver em execução
          };
        });
      }
    }

    // Função de limpeza
    return () => {
      if (timerIntervalRef && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isOpen, taskId, timerRunningTaskId, task]); // Adicionada a dependência em task para garantir que o timer seja atualizado quando a tarefa mudar

  // Efeito separado para iniciar o timer quando a tarefa está em andamento
  // Este efeito é executado apenas uma vez quando o modal é aberto
  useEffect(() => {
    if (!isOpen || !taskId || !task) return;

    // Verificar se o timer está em execução para esta tarefa
    const isTimerRunning = timerRunningTaskId === String(taskId);

    // TEMPORIZADOR DESABILITADO - não iniciar timer automaticamente
    // Se a tarefa estiver em andamento, o timer não estiver em execução, e não foi pausado manualmente, iniciar o timer
    // Executamos isso apenas uma vez quando o modal é aberto, não em cada atualização do status
    // if (task.status === 'em_andamento' && !isTimerRunning && !manuallyPaused) {
    //   // Iniciar o timer diretamente em vez de chamar onTaskUpdated
    //   if (typeof setTimerRunningTaskId === 'function') {
    //     setTimerRunningTaskId(String(taskId));
    //   }
    // }
  }, [isOpen, taskId, task]); // Este efeito é executado apenas quando o modal é aberto ou a tarefa é carregada

  const fetchTaskDetails = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${id}`);
      }


      // Carregar detalhes da tarefa
      const { data: taskData } = await refetchTask();
      if (!taskData) throw new Error('Tarefa não encontrada');

      // Usar os dados da tarefa diretamente da API
      const completeTaskData = taskData;

      // Verificar se a tarefa tem um projeto e equipes
      if (completeTaskData.project) {
        // dados adicionais do projeto serão preenchidos via React Query
      }

      setTask(completeTaskData);

      // Atualizar informações do projeto quando disponíveis via React Query
      if (projectDetails) {
        setTask(prev => {
          if (!prev || !prev.project) return prev;
          if (prev.project.id !== projectDetails.id) return prev;
          return {
            ...prev,
            project: { ...prev.project, ...projectDetails },
          };
        });
      }

      // Carregar usuários para exibição de comentários e menções
      setUsers(usersData)

      // Carregar equipes (occupações)
      setOccupations(occupationsQueryData);

      // Carregar projetos

      // Comentários agora são carregados com a tarefa em taskData.comments (ou completeTaskData.comments)
      // Garantir que completeTaskData ainda tenha os comentários
      // e que eles sejam do tipo ApiComment[]
      if (completeTaskData.comments && Array.isArray(completeTaskData.comments)) {
        setComments(completeTaskData.comments as ApiComment[]);
      } else if (taskData.comments && Array.isArray(taskData.comments)) {
        // Fallback para taskData se completeTaskData não os tiver
        setComments(taskData.comments as ApiComment[]);
      } else {
        setComments([]);
      }
      // A lógica de inicialização de curtidas foi movida para CommentItem.tsx

      // Dados simulados do histórico foram removidos.
      // A busca real do histórico será implementada na próxima etapa do plano.
      setHistory([]); // Definir histórico como vazio por enquanto.
    } catch (err) {
      setError('Não foi possível carregar os detalhes da tarefa. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar o modo de edição
  const startEditMode = () => {
    if (!task) return;

    // Verificar se o usuário é um membro e tem permissões limitadas
    if (permissions.isMember) {
      // Para membros, permitir editar apenas status e comentários
      const editData: Partial<Task> = {
        status: task.status
      };

      setEditedTask(editData);
      setIsEditMode(true);
      return;
    }

    // Para outros usuários (admin, gerente), permitir edição completa
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
    console.log('handleFieldChange chamado:', { field, value });
    // Tratamento especial para campos de data
    if (field === 'start_date' || field === 'due_date') {
      // Se o valor for uma string vazia, definir como null para indicar que a data foi removida
      if (value === '') {
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
          setEditedTask(prev => ({
            ...prev,
            [field]: date.toISOString()
          }));
          return;
        }
      }
    }

    // Tratamento especial para o campo occupations (equipes)
    if (field === 'occupations') {
      // Garantir que o valor seja um array
      const occupationsArray = Array.isArray(value) ? value : [value];
      setEditedTask(prev => ({
        ...prev,
        [field]: occupationsArray
      }));
      return;
    }

    // Tratamento especial para o campo status
    if (field === 'status' && task) {
      // Verificar se o status está sendo alterado para "em_andamento"
      if (value === 'em_andamento') {

        // Resetar o estado de pausa manual
        setManuallyPaused(false);

        // Iniciar o timer (será aplicado quando o usuário salvar as alterações)
        // Não iniciamos o timer aqui, apenas quando o usuário salvar as alterações
      }
    }

    // Para outros campos, atualizar normalmente
    setEditedTask(prev => ({
      ...prev,
      [field]: field === 'status' ? value as TaskStatus : value
    }));
  };

  // Salvar as alterações feitas no modo de edição
  const saveChanges = async () => {
    if (!task) return;

    try {

      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(task.id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${task.id}`);
      }

      let taskData;

      // Verificar se o usuário é um membro e tem permissões limitadas
      if (permissions.isMember) {
        // Para membros, permitir atualizar apenas o status
        if (editedTask.status) {
          taskData = { status: editedTask.status };
        } else {
          // Se não houver status para atualizar, não fazer nada
          setIsEditMode(false);
          setEditedTask({});
          return;
        }
      } else {
        // Para outros usuários (admin, gerente), permitir atualização completa
        // Verificar se estamos atualizando apenas datas
        const isDateOnlyUpdate = Object.keys(editedTask).every(key =>
          ['start_date', 'due_date'].includes(key)
        );

        if (isDateOnlyUpdate) {
          // Para atualizações apenas de datas, enviar apenas os campos modificados
          taskData = {
            start_date: editedTask.start_date ? new Date(editedTask.start_date).toISOString() : undefined,
            due_date: editedTask.due_date ? new Date(editedTask.due_date).toISOString() : undefined
          };
        } else {
          // Para atualizações completas, usar a função prepareTaskDataForApi
          taskData = prepareTaskDataForApi(task, editedTask);
        }
      }

      // Logs detalhados para depuração

      // Enviar a requisição para a API
      const updatedTask = await updateTask({ id: taskId, data: taskData });

      // Usar os dados da tarefa diretamente da API
      const preservedTask = {
        ...updatedTask,
        // Preservar o objeto project se não estiver presente na resposta
        project: updatedTask.project || task.project
      };

      setTask(preservedTask);
      setIsEditMode(false);
      setEditedTask({});
      toast.success('Tarefa atualizada com sucesso!');

      // Verificar se o status foi alterado para "em_andamento"
      if (taskData.status === 'em_andamento' || preservedTask.status === 'em_andamento') {

        // Resetar o estado de pausa manual
        setManuallyPaused(false);

        // TEMPORIZADOR DESABILITADO - não iniciar timer automaticamente
        // Iniciar o timer
        // if (typeof setTimerRunningTaskId === 'function') {
        //   setTimerRunningTaskId(String(task.id));
        // }
      } else if ((taskData.status && taskData.status !== 'em_andamento') ||
                (preservedTask.status && preservedTask.status !== 'em_andamento' as TaskStatus)) {
        // Se o status foi alterado para algo diferente de "em_andamento", parar o timer

        // Parar o timer
        if (typeof setTimerRunningTaskId === 'function' && timerRunningTaskId === String(task.id)) {
          setTimerRunningTaskId(null);
        }
      }

      onTaskUpdated();
    } catch (err) {
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

      await deleteTaskMutation(taskId);
      setIsDeleteDialogOpen(false);
      onClose();
      toast.success('Tarefa excluída com sucesso!');
      onTaskUpdated();
    } catch (err) {
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
      // Garantir que newStatus seja um TaskStatus válido para a atribuição
      const taskData: { status: TaskStatus } = { status: newStatus as TaskStatus };


      // Enviar a requisição para a API
      const updatedTask = await updateTask({ id: taskId, data: taskData });

      // Converter os nomes dos campos da API para o formato usado no frontend
      const preservedTask = {
        ...transformApiTaskToFrontend(updatedTask),
        // Preservar o objeto project se não estiver presente na resposta
        project: updatedTask.project || task.project
      };


      setTask(preservedTask);
      toast.success(
        newStatus === 'concluido'
          ? 'Tarefa marcada como concluída!'
          : 'Tarefa marcada como pendente!'
      );

      // Ao alternar para 'concluido' ou 'a_fazer', o timer para esta tarefa deve ser interrompido.
      // A condição original if (newStatus === 'em_andamento') era sempre falsa neste contexto.
      // Portanto, a lógica do 'else' é a que efetivamente se aplica.

      // Parar o timer
      if (typeof setTimerRunningTaskId === 'function' && timerRunningTaskId === String(task.id)) {
        setTimerRunningTaskId(null);
      }

      onTaskUpdated();
    } catch (err) {
      toast.error('Erro ao atualizar status da tarefa. Tente novamente.');
    }
  };

  // Função para alterar status rapidamente sem entrar no modo de edição
  const handleQuickStatusChange = async (newStatus: TaskStatus) => {
    if (!task || task.status === newStatus) return;

    try {
      // Garantir que o ID da tarefa seja um número válido
      const taskId = Number(task.id);
      if (isNaN(taskId) || taskId <= 0) {
        throw new Error(`ID de tarefa inválido: ${task.id}`);
      }

      const taskData: { status: TaskStatus } = { status: newStatus };

      // Enviar a requisição para a API
      const updatedTask = await updateTask({ id: taskId, data: taskData });

      // Atualizar o estado local da tarefa
      setTask(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: newStatus,
          // Preservar outros campos
        };
      });

      toast.success(`Status alterado para ${getStatusLabel(newStatus)}`);

      // TEMPORIZADOR DESABILITADO - não gerenciar timer automaticamente
      // Gerenciar timer baseado no novo status
      // if (newStatus === 'em_andamento') {
      //   // Se mudou para "em andamento", resetar pausa manual e iniciar timer
      //   setManuallyPaused(false);
      //   if (typeof setTimerRunningTaskId === 'function') {
      //     setTimerRunningTaskId(String(task.id));
      //   }
      // } else {
      //   // Se mudou para qualquer outro status, parar o timer
      //   if (typeof setTimerRunningTaskId === 'function' && timerRunningTaskId === String(task.id)) {
      //     setTimerRunningTaskId(null);
      //   }
      // }

      onTaskUpdated();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      toast.error('Erro ao alterar status da tarefa. Tente novamente.');
    }
  };

    // Função para adicionar um novo comentário (agora chama a API)
  const handleAddComment = async () => {

    // Verificar condições da guarda
    if (!comment.trim()) {
      return;
    }
    if (!task) {
      return;
    }
    if (isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      const commentData = {
        content: comment,
        task_id: task.id,
        // parentId: null, // Para comentários de nível superior. Adicionar lógica se for resposta.
        // mentioned_users: mentionedUsers, // Se a API suportar envio de menções na criação
      };
      const newCommentFromApi = await createComment(commentData);

      // ENRIQUECER o comentário da API com os dados do usuário local (authUser)
      const commentWithUser = {
        ...newCommentFromApi,
        user: authUser ? {
          id: authUser.id,
          name: authUser.name || 'Usuário Desconhecido',
          email: authUser.email,
          // Adicione aqui outros campos da interface User se necessário/disponível em authUser
        } : undefined
      };

      // Adicionar o novo comentário no início da lista para melhor UX
      // Usando o comentário enriquecido em vez do original da API
      setComments(prevComments => [commentWithUser, ...prevComments]);
      setComment('');
      setMentionedUsers([]); // Resetar menções após o envio
      toast.success('Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Não foi possível adicionar o comentário. Tente novamente.');
    } finally {
      setIsSubmittingComment(false);
    }
  }; // Fim da função handleAddComment

  // A função handleLikeToggle foi movida para CommentItem.tsx

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

  // Função para obter todos os usuários vinculados ao projeto e às equipes
  const getFilteredProjectUsers = () => {
    if (!task || !task.project) return [];

    // Obter IDs das equipes selecionadas
    const selectedTeamIds = editedTask.occupations ?
      (Array.isArray(editedTask.occupations) ?
        editedTask.occupations.map(o => typeof o === 'number' ? o : o.id) :
        []) :
      (Array.isArray(task.occupations) ?
        task.occupations.map(o => typeof o === 'number' ? o : o.id) :
        []);


    // Criar um conjunto para armazenar IDs de usuários únicos
    const uniqueUserIds = new Set();
    const projectUsersList = [];

    // Estratégia 1: Obter todos os usuários das equipes do projeto
    // Isso é o mais importante, já que task.project.users pode ser undefined
    if (task.project && task.project.occupations && Array.isArray(task.project.occupations)) {
      // Obter IDs de todas as equipes do projeto
      const projectTeamIds = task.project.occupations.map(team =>
        typeof team === 'number' ? team : team.id
      );


      // Para cada equipe do projeto, buscar seus usuários
      projectTeamIds.forEach(teamId => {
        // Encontrar a equipe completa na lista de equipes
        const team = occupations.find(t => {
          const tId = typeof t === 'number' ? t : t.id;
          return tId === teamId;
        });

        if (team && team.users && Array.isArray(team.users)) {

          // Adicionar usuários da equipe
          team.users.forEach(teamUser => {
            const userId = typeof teamUser === 'number' ? teamUser : teamUser.id;
            if (!uniqueUserIds.has(userId)) {
              // Encontrar o usuário completo na lista de usuários
              const fullUser = users.find(u => u.id === userId);
              if (fullUser) {
                projectUsersList.push(fullUser);
                uniqueUserIds.add(userId);
              }
            }
          });
        } else {
        }
      });

      // Adicionar usuários que têm essas equipes em suas ocupações
      users.forEach(user => {
        // Verificar se o usuário já foi adicionado
        if (uniqueUserIds.has(user.id)) return;

        // Verificar se o usuário pertence a alguma das equipes do projeto
        const isInProjectTeams = user.occupations ?
          user.occupations.some((userTeam: any) => {
            const userTeamId = typeof userTeam === 'number' ? userTeam : userTeam.id;
            return projectTeamIds.includes(userTeamId);
          }) : false;

        if (isInProjectTeams) {
          projectUsersList.push(user);
          uniqueUserIds.add(user.id);
        }
      });
    }

    // Estratégia 2: Adicionar usuários do projeto (se disponíveis)
    if (task.project.users && Array.isArray(task.project.users)) {
      task.project.users.forEach((projectUser: any) => {
        const userId = typeof projectUser === 'number' ? projectUser : projectUser.id;
        if (!uniqueUserIds.has(userId)) {
          // Encontrar o usuário completo na lista de usuários
          const fullUser = users.find(u => u.id === userId);
          if (fullUser) {
            projectUsersList.push(fullUser);
            uniqueUserIds.add(userId);
          }
        }
      });
    } else {
      // Se task.project.users não estiver disponível, tentar buscar todos os usuários do projeto

      // Adicionar todos os usuários que têm o projeto_id correspondente
      users.forEach(user => {
        if (!uniqueUserIds.has(user.id) && user.projects) {
          const isInProject = Array.isArray(user.projects) && user.projects.some((p: any) => {
            const projectId = typeof p === 'number' ? p : p.id;
            return projectId === task.project.id;
          });

          if (isInProject) {
            projectUsersList.push(user);
            uniqueUserIds.add(user.id);
          }
        }
      });
    }

    // Estratégia 3: Adicionar usuários já atribuídos à tarefa
    if (task.users && Array.isArray(task.users)) {
      task.users.forEach((taskUser: any) => {
        const userId = typeof taskUser === 'number' ? taskUser : taskUser.id;
        if (!uniqueUserIds.has(userId)) {
          // Encontrar o usuário completo na lista de usuários
          const fullUser = users.find(u => u.id === userId);
          if (fullUser) {
            projectUsersList.push(fullUser);
            uniqueUserIds.add(userId);
          }
        }
      });
    }

    // Estratégia adicional: Associar manualmente as equipes aos usuários
    // Isso é necessário porque às vezes as equipes não são carregadas corretamente
    projectUsersList.forEach(user => {
      // Se o usuário não tem equipes, mas tem occupation_id, adicionar a equipe correspondente
      if ((!user.occupations || user.occupations.length === 0) && (user.occupation_id || user.occupationId)) {
        const occupationId = user.occupation_id || user.occupationId;
        const team = occupations.find(t => t.id === occupationId);
        if (team) {
          user.occupations = [{ id: team.id, name: team.name }];
        }
      }

      // Se o usuário não tem equipes, mas tem occupation, adicionar a equipe correspondente
      if ((!user.occupations || user.occupations.length === 0) && user.occupation) {
        const occupation = user.occupation;
        const occupationId = typeof occupation === 'number' ? occupation : occupation.id;
        const team = occupations.find(t => t.id === occupationId);
        if (team) {
          user.occupations = [{ id: team.id, name: team.name }];
        }
      }
    });

    // Estratégia 4: Se ainda não temos usuários, mostrar todos os usuários disponíveis
    if (projectUsersList.length === 0) {

      // Adicionar todos os usuários disponíveis
      users.forEach(user => {
        if (!uniqueUserIds.has(user.id)) {
          projectUsersList.push(user);
          uniqueUserIds.add(user.id);
        }
      });
    }


    // Log detalhado de cada usuário e suas equipes
    projectUsersList.forEach(user => {
    });

    return projectUsersList;
  };

  // Obter todos os itens de atividade ordenados por data
  const getActivityItems = () => {
    let items: (ApiComment | TaskHistoryItem & { type: 'comment' | 'history' })[] = [];

    // Adicionar comentários
    if (activityTab === 'all' || activityTab === 'comments') {
      items = [...items, ...comments.map(comment => ({ ...comment, type: 'comment' as const }))];
    }

    // Adicionar histórico
    if (activityTab === 'all' || activityTab === 'history') {
      items = [...items, ...history.map(item => ({ ...item, type: 'history' as const }))];
    }

    // Ordenar por data (mais recente primeiro)
    // Ordenar por data (mais recente primeiro), tratando datas inválidas
    return items.sort((a, b) => {
      const dateA = a.createdAt ? parseISO(a.createdAt) : null; // Usar createdAt da interface atualizada
      const dateB = b.createdAt ? parseISO(b.createdAt) : null; // Usar createdAt da interface atualizada

      const isValidA = dateA && isValid(dateA);
      const isValidB = dateB && isValid(dateB);

      // Colocar itens com datas inválidas no final
      if (!isValidA && !isValidB) return 0; // Manter ordem relativa se ambos inválidos
      if (!isValidA) return 1; // 'a' (inválido) vem depois de 'b' (válido)
      if (!isValidB) return -1; // 'b' (inválido) vem depois de 'a' (válido)

      // Se ambos válidos, comparar timestamps (mais recente primeiro)
      return dateB.getTime() - dateA.getTime();
    });
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
    // Inicializar com um objeto vazio e adicionar apenas os campos modificados
    const taskData: any = {};

    // Adicionar campos apenas se eles foram modificados
    if (updatedFields.title !== undefined) {
      taskData.title = updatedFields.title;
    }

    if (updatedFields.description !== undefined) {
      taskData.description = updatedFields.description;
    }

    if (updatedFields.status !== undefined) {
      taskData.status = updatedFields.status;
    }

    if (updatedFields.priority !== undefined) {
      taskData.priority = updatedFields.priority;
    }

    // Tratar o project_id com cuidado especial - usar o formato camelCase para a API
    // Incluir apenas se foi modificado
    if (updatedFields.project_id !== undefined) {
      taskData.projectId = Number(updatedFields.project_id);
    }

    // Tratar as datas com cuidado - usar o formato camelCase para a API
    // Incluir a data de início apenas se foi modificada
    if (updatedFields.start_date !== undefined) {
      if (isValidDate(updatedFields.start_date)) {
        // Se uma nova data válida foi fornecida, usar essa data
        const startDate = new Date(updatedFields.start_date);
        taskData.start_date = startDate.toISOString();
      } else {
        // Se a data foi definida como null ou string vazia, enviar null
        taskData.start_date = null;
      }
    }

    // Incluir a data de vencimento apenas se foi modificada
    if (updatedFields.due_date !== undefined) {
      if (isValidDate(updatedFields.due_date)) {
        // Se uma nova data válida foi fornecida, usar essa data
        const dueDate = new Date(updatedFields.due_date);
        taskData.due_date = dueDate.toISOString();
      } else {
        // Se a data foi definida como null ou string vazia, enviar null
        taskData.due_date = null;
      }
    }

    // Tratar o campo order apenas se foi modificado
    if (updatedFields.order !== undefined) {
      taskData.order = Number(updatedFields.order);
    }

    // Tratar os campos de relacionamentos apenas se foram modificados
    // Converter os usuários para um array de IDs
    if (updatedFields.users !== undefined) {
      taskData.users = Array.isArray(updatedFields.users)
        ? updatedFields.users.map(u => typeof u === 'number' ? Number(u) : Number(u.id))
        : [];
    }

    // Converter as ocupações para um array de IDs
    if (updatedFields.occupations !== undefined) {
      taskData.occupations = Array.isArray(updatedFields.occupations)
        ? updatedFields.occupations.map(o => typeof o === 'number' ? Number(o) : Number(o.id))
        : [];
    }

    // Não precisamos verificar campos obrigatórios para atualizações parciais com PATCH
    // Apenas verificar se há pelo menos um campo para atualizar
    if (Object.keys(taskData).length === 0) {
      // Não lançar erro, apenas retornar um objeto vazio
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
      icon: <CalendarIcon className="h-4 w-4 mr-1" />
    };
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'a_fazer': return 'A Fazer';
      case 'em_andamento': return 'Em Andamento';
      case 'em_revisao': return 'Em Revisão';
      case 'concluido': return 'Concluído';
      case 'aguardando_cliente': return 'Aguardando Cliente';
      case 'cancelado': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'concluido': return 'default';
      case 'em_andamento': return 'secondary';
      case 'em_revisao': return 'warning';
      case 'aguardando_cliente': return 'warning'; // Amarelo/Laranja
      case 'cancelado': return 'destructive'; // Vermelho claro
      default: return 'outline';
    }
  };

  const getStatusClass = (status?: string): string => {
    switch (status) {
      case 'pendente': return '';
      case 'a_fazer': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
      case 'em_andamento': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
      case 'em_revisao': return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
      case 'aguardando_cliente': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
      case 'concluido': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
      case 'cancelado': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
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

  const getStatusIndicatorClass = (status?: string): string => {
    switch (status) {
      case 'pendente': return 'bg-gray-400';
      case 'a_fazer': return 'bg-blue-500';
      case 'em_andamento': return 'bg-amber-500';
      case 'em_revisao': return 'bg-purple-500';
      case 'aguardando_cliente': return 'bg-yellow-500';
      case 'concluido': return 'bg-green-500';
      case 'cancelado': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Função para salvar o conteúdo do editor de tela cheia
  const handleSaveFullScreenContent = (content: string) => {
    console.log('handleSaveFullScreenContent chamado com:', content);
    console.log('Atualizando apenas o estado editedTask (sem salvar na API)');
    
    // Atualizar apenas o estado editedTask para manter as alterações no modo de edição
    handleFieldChange('description', content);
    
    // O usuário precisará clicar em "Salvar" no modal principal para persistir na API
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1000px]" aria-describedby="loading-description">
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
        <DialogContent className="sm:max-w-[1000px]">
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
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] flex flex-col overflow-y-auto p-0" aria-describedby="task-description">
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
                        <>
                          {/* Botão de duplicar (visível para todos) */}
                          {onDuplicateTask && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => onDuplicateTask(task)}
                              title="Duplicar tarefa"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Mostrar botão de edição apenas para usuários que não são membros */}
                          {!permissions.isMember ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={startEditMode}
                              title="Editar tarefa"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  title="Alterar status"
                                >
                                  <span className="text-muted-foreground">◉</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    const newStatus = "pendente";
                                    updateTask({ id: task.id, data: { status: newStatus } })
                                      .then(() => {
                                        setTask(prev => prev ? { ...prev, status: newStatus } : null);
                                        toast.success('Status atualizado para Pendente');
                                        onTaskUpdated();
                                      })
                                      .catch(_err => {
                                        toast.error('Erro ao atualizar status');
                                      });
                                  }}
                                  className={task.status === 'pendente' ? 'bg-muted' : ''}
                                >
                                  Pendente
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const newStatus = "a_fazer";
                                    updateTask({ id: task.id, data: { status: newStatus } })
                                      .then(() => {
                                        setTask(prev => prev ? { ...prev, status: newStatus } : null);
                                        toast.success('Status atualizado para A Fazer');
                                        onTaskUpdated();
                                      })
                                      .catch(_err => {
                                        toast.error('Erro ao atualizar status');
                                      });
                                  }}
                                  className={task.status === 'a_fazer' ? 'bg-muted' : ''}
                                >
                                  A Fazer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const newStatus = "em_andamento";
                                    updateTask({ id: task.id, data: { status: newStatus } })
                                      .then(() => {
                                        setTask(prev => prev ? { ...prev, status: newStatus } : null);
                                        toast.success('Status atualizado para Em Andamento');
                                        onTaskUpdated();
                                      })
                                      .catch(err => {
                                        toast.error('Erro ao atualizar status');
                                      });
                                  }}
                                  className={task.status === 'em_andamento' ? 'bg-muted' : ''}
                                >
                                  Em Andamento
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const newStatus = "em_revisao";
                                    updateTask({ id: task.id, data: { status: newStatus } })
                                      .then(() => {
                                        setTask(prev => prev ? { ...prev, status: newStatus } : null);
                                        toast.success('Status atualizado para Em Revisão');
                                        onTaskUpdated();
                                      })
                                      .catch(err => {
                                        toast.error('Erro ao atualizar status');
                                      });
                                  }}
                                  className={task.status === 'em_revisao' ? 'bg-muted' : ''}
                                >
                                  Em Revisão
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const newStatus = "concluido";
                                    updateTask({ id: task.id, data: { status: newStatus } })
                                      .then(() => {
                                        setTask(prev => prev ? { ...prev, status: newStatus } : null);
                                        toast.success('Status atualizado para Concluído');
                                        onTaskUpdated();
                                      })
                                      .catch(err => {
                                        toast.error('Erro ao atualizar status');
                                      });
                                  }}
                                  className={task.status === 'concluido' ? 'bg-muted' : ''}
                                >
                                  Concluído
                                </DropdownMenuItem>
                                
                                {/* Adicionar opção de duplicar no dropdown para membros */}
                                {onDuplicateTask && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onDuplicateTask(task)}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicar Tarefa
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </>
                      )}

                      {/* Mostrar botão de exclusão apenas para usuários que não são membros */}
                      {!permissions.isMember && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Dialog de confirmação de exclusão */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent aria-describedby="delete-description">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
                  <AlertDialogDescription id="delete-description">
                    Tem certeza que deseja excluir esta tarefa?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                  <p className="text-sm">Todos os dados relacionados a esta tarefa serão perdidos.</p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center gap-2 mt-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <DialogDescription className="m-0">
                {task.project ? task.project.title : 'Sem projeto associado'}
              </DialogDescription>
            </div>

            {/* Descrição */}
            <div className="mb-6 mt-4">
              <h3 className="font-medium mb-2">Descrição</h3>
              {isEditMode && !permissions.isMember ? (
                <RichTextEditor
                  content={editedTask.description !== undefined ? editedTask.description : task.description || ''}
                  onChange={(html) => handleFieldChange('description', html)}
                  editable={true} // Em modo de edição, sempre editável
                  onExpand={() => setIsFullScreenEditorOpen(true)} // Passar a função para abrir o modal de tela cheia
                />
              ) : (
                <div id="task-description" className="prose dark:prose-invert text-sm p-3 border rounded-md bg-muted/30 min-h-[100px] overflow-auto prose prose-sm max-w-none [&_br]:block [&_br]:mb-2 [&_.hard-break]:block [&_.hard-break]:mb-2 [&_p:empty]:h-6 [&_p:empty]:block">
                  {task.description ? (
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                  ) : (
                    'Sem descrição.'
                  )}
                </div>
              )}
              
              {/* Botão Ver Detalhes */}
              {task.has_detailed_fields && (
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetailsPopup(true)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Detalhes organizados em grid */}
            <div className="space-y-5 mt-4">
              {/* Datas */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Datas</div>
                </div>
                {isEditMode && !permissions.isMember ? (
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground">Início</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal text-sm",
                              !editedTask.start_date && !task.start_date && "text-muted-foreground"
                            )}
                          >
                            {editedTask.start_date || task.start_date ? (
                              format(new Date(editedTask.start_date || task.start_date), "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <ShadcnCalendar
                            mode="single"
                            selected={editedTask.start_date ? new Date(editedTask.start_date) : task.start_date ? new Date(task.start_date) : undefined}
                            onSelect={(selectedDate) => handleFieldChange('start_date', selectedDate ? selectedDate.toISOString() : null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground">Fim</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal text-sm",
                              !editedTask.due_date && !task.due_date && "text-muted-foreground"
                            )}
                          >
                            {editedTask.due_date || task.due_date ? (
                              format(new Date(editedTask.due_date || task.due_date), "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <ShadcnCalendar
                            mode="single"
                            selected={editedTask.due_date ? new Date(editedTask.due_date) : task.due_date ? new Date(task.due_date) : undefined}
                            onSelect={(selectedDate) => handleFieldChange('due_date', selectedDate ? selectedDate.toISOString() : null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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

              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <span className="text-muted-foreground">◉</span>
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Status</div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <select
                      value={editedTask.status || task.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="border rounded-md px-2 py-1 text-sm bg-secondary text-secondary-foreground">
                      <option value="pendente">Pendente</option>
                      <option value="a_fazer">A Fazer</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="em_revisao">Em Revisão</option>
                      <option value="aguardando_cliente">Aguardando Cliente</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-auto px-2 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity border ${getStatusClass(task.status)}`}
                          title="Clique para alterar o status"
                        >
                          {getStatusLabel(task.status)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {['pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'aguardando_cliente', 'concluido', 'cancelado'].map((status) => (
                          <DropdownMenuItem
                            key={status}
                              onClick={() => handleQuickStatusChange(status as TaskStatus)}
                              className={task.status === status ? 'bg-muted' : ''}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getStatusIndicatorClass(status)}`} />
                                {getStatusLabel(status)}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                  )}
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
            {isEditMode && !permissions.isMember ? (
              <select
                value={editedTask.priority || task.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                className="border rounded-md px-2 py-1 text-sm bg-secondary text-secondary-foreground">
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

              {/* Temporizador */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="w-28">
                  <div className="text-sm font-medium">Temporizador</div>
                </div>
                <div className="text-sm">
                  {task && (
                    <TaskTimer
                      key={`timer-${task.id}`} // Usar apenas o ID da tarefa como chave para evitar recriações desnecessárias
                      taskId={String(task.id)}
                      initialTime={
                        // Sempre usar o valor mais recente do timer
                        // Prioridade: 1. Valor atual no estado global, 2. Valor no estado local da tarefa
                        (currentTimerValues && currentTimerValues[String(task.id)]) || task.timer || 0
                      }
                      isRunning={timerRunningTaskId === String(task.id)}
                      disabled={true} // TEMPORIZADOR DESABILITADO - não é prioridade corrigir bugs
                      onStatusChange={(status) => {
                        // Atualizar o status da tarefa quando o temporizador é iniciado/pausado
                        const apiStatus = status === "Em Andamento" ? "em_andamento" : "a_fazer";

                        // Quando o timer é iniciado, precisamos forçar uma atualização no estado local
                        // e também notificar o componente pai para atualizar o estado global
                        if (status === "Em Andamento") {

                          // Resetar o estado de pausa manual
                          setManuallyPaused(false);

                          // Atualizar o estado local da tarefa
                          setTask(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              status: apiStatus,
                              // Não alteramos o timer aqui, apenas o status
                            };
                          });

                          // Notificar o componente pai (KanbanBoard) que o timer foi iniciado
                          // Isso fará com que o KanbanBoard atualize o timerRunningTaskId
                          if (onTaskUpdated) {
                            onTaskUpdated();
                          }

                          // Atualizar o status da tarefa na API
                          updateTask({
                            id: task.id,
                            data: { status: apiStatus },
                          })
                          .then(() => {
                            // Não precisamos atualizar o estado local novamente, pois já fizemos isso acima
                          })
                          .catch(err => {
                          });
                        } else {
                          // Se estamos pausando o timer, marcar como pausado manualmente
                          setManuallyPaused(true);

                          // Parar o timer imediatamente, sem depender da atualização do status
                          if (typeof setTimerRunningTaskId === 'function') {
                            // Notificar o KanbanBoard para parar o timer

                            // Definir timerRunningTaskId como null diretamente
                            const taskIdStr = String(task.id);
                            if (timerRunningTaskId === taskIdStr) {
                              setTimerRunningTaskId(null);
                            }
                          }

                          // Se estamos pausando o timer, atualizar o status normalmente
                          if (task.status !== apiStatus) {
                            handleFieldChange('status', apiStatus);
                            if (!isEditMode) {
                              // Se não estiver em modo de edição, salvar a alteração imediatamente
                              updateTask({ id: task.id, data: { status: apiStatus } })
                                .then(() => {
                                  setTask(prev => prev ? { ...prev, status: apiStatus } : null);
                                })
                                .catch(err => {
                                });
                            }
                          }
                        }
                      }}
                      onTimerUpdate={(seconds) => {
                        // Atualizar o timer no backend quando o temporizador é pausado
                        if (!isEditMode) {

                          // Garantir que o valor seja um número válido
                          const timerValue = Number(seconds);

                          if (isNaN(timerValue)) {
                            toast.error('Erro ao processar o tempo. Usando valor padrão.');
                            return; // Não prosseguir com a atualização
                          }

                          // Obter o valor atual do timer da tarefa (pode ser 0 se não existir)
                          const currentTimer = task.timer || 0;

                          // Verificar se o valor mudou significativamente para evitar atualizações desnecessárias
                          if (Math.abs(timerValue - currentTimer) < 5) {
                            return;
                          }


                          // Usar o valor recebido do componente TaskTimer
                          // Este valor já representa o tempo total acumulado
                          const newTimerValue = timerValue;

                          // Criar objeto de atualização explicitamente
                          const updateData = {
                            timer: newTimerValue
                          };


                          // Mostrar toast de informação
                          toast.info('Atualizando tempo da tarefa...');

                          // Atualizar o estado local primeiro para evitar recarregar o modal
                          setTask(prev => prev ? {
                            ...prev,
                            timer: newTimerValue
                          } : null);

                          // Usar uma variável local para controlar se a requisição já foi feita
                          const requestId = Date.now();

                          // Criar uma variável de referência para controlar as requisições
                          const requestIdRef = { id: requestId };

                          // Esperar um pouco antes de fazer a requisição para evitar múltiplas requisições
                          setTimeout(() => {
                            // Verificar se esta ainda é a requisição mais recente
                            if (requestIdRef.id !== requestId) {
                              return;
                            }

                            // Depois atualizar no backend
                            updateTask({ id: task.id, data: updateData })
                              .then((updatedTask) => {
                                toast.success('Tempo da tarefa atualizado com sucesso!');

                                // Não atualizar o estado novamente para evitar recarregar o modal
                                // Apenas verificar se o valor retornado é diferente do esperado
                                if (updatedTask.timer && updatedTask.timer !== newTimerValue) {
                                }
                              })
                              .catch(err => {
                                toast.error('Erro ao atualizar o tempo da tarefa.');
                              });
                          }, 500);
                        }
                      }}
                      compact={false}
                    />
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{task.project ? task.project.title : 'Sem projeto'}</span>
                      <Badge variant="outline" className="text-xs bg-muted/50">
                        Não editável
                      </Badge>
                    </div>
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

                    <div className="border rounded-md p-2 text-sm w-full max-h-36 overflow-y-auto bg-blue-50/30 border-blue-200 space-y-1">
                      {/* Obter os IDs das equipes selecionadas */}
                      {(() => {
                        const selectedTeamIds = editedTask.occupations ?
                          (Array.isArray(editedTask.occupations) ?
                            editedTask.occupations.map(o => typeof o === 'number' ? o : o.id) :
                            []) :
                          (Array.isArray(task.occupations) ?
                            task.occupations.map(o => typeof o === 'number' ? o : o.id) :
                            []);


                        // Vamos manter um conjunto de equipes que devem ser exibidas
                        let occupationsToShow = [];
                        let occupationsToShowIds = new Set();

                        // 1. Primeiro, adicionar as equipes do projeto (se existirem)
                        if (task.project && task.project.occupations && Array.isArray(task.project.occupations) && task.project.occupations.length > 0) {
                          task.project.occupations.forEach(team => {
                            const teamId = typeof team === 'number' ? team : team.id;
                            if (!occupationsToShowIds.has(teamId)) {
                              occupationsToShow.push(team);
                              occupationsToShowIds.add(teamId);
                            }
                          });
                        }

                        // 2. Adicionar as equipes originais da tarefa (para manter equipes que foram desmarcadas)
                        if (Array.isArray(task.occupations) && task.occupations.length > 0) {
                          task.occupations.forEach(team => {
                            const teamId = typeof team === 'number' ? team : team.id;
                            if (!occupationsToShowIds.has(teamId)) {
                              // Buscar a equipe completa na lista de equipes
                              const fullTeam = occupations.find(t => {
                                const tId = typeof t === 'number' ? t : t.id;
                                return tId === teamId;
                              });

                              if (fullTeam) {
                                occupationsToShow.push(fullTeam);
                              } else {
                                // Se não encontrar, criar um objeto temporário
                                occupationsToShow.push({ id: teamId, name: `Equipe ${teamId}` });
                              }
                              occupationsToShowIds.add(teamId);
                            }
                          });
                        }

                        // 3. Adicionar as equipes atualmente selecionadas (que podem ter sido adicionadas durante a edição)
                        if (selectedTeamIds.length > 0) {
                          selectedTeamIds.forEach(teamId => {
                            if (!occupationsToShowIds.has(teamId)) {
                              // Buscar a equipe completa na lista de equipes
                              const fullTeam = occupations.find(t => {
                                const tId = typeof t === 'number' ? t : t.id;
                                return tId === teamId;
                              });

                              if (fullTeam) {
                                occupationsToShow.push(fullTeam);
                              } else {
                                // Se não encontrar, criar um objeto temporário
                                occupationsToShow.push({ id: teamId, name: `Equipe ${teamId}` });
                              }
                              occupationsToShowIds.add(teamId);
                            }
                          });
                        }


                        return occupationsToShow.map((team: any) => {
                          const teamId = typeof team === 'number' ? team : team.id;
                          const teamName = typeof team === 'number' ?
                            (occupations.find(t => t.id === team)?.name || `Equipe ${team}`) :
                            team.name;
                          const isSelected = selectedTeamIds.includes(teamId);

                          return (
                            <div key={teamId} className="flex items-center space-x-2 hover:bg-blue-100/50 p-1 rounded">
                              <Checkbox
                                id={`team-${teamId}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const newSelectedTeams = [...selectedTeamIds];
                                  if (checked) {
                                    // Adicionar equipe se não estiver selecionada
                                    if (!newSelectedTeams.includes(teamId)) {
                                      newSelectedTeams.push(teamId);
                                    }
                                  } else {
                                    // Remover equipe se estiver selecionada
                                    const index = newSelectedTeams.indexOf(teamId);
                                    if (index !== -1) {
                                      newSelectedTeams.splice(index, 1);
                                    }
                                  }

                                  // Atualizar o estado com as novas equipes selecionadas
                                  handleFieldChange('occupations', newSelectedTeams);

                                  // Importante: Não recarregar a lista de equipes aqui
                                  // para manter todas as equipes visíveis
                                }}
                              />
                              <label
                                htmlFor={`team-${teamId}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {teamName}
                              </label>
                            </div>
                          );
                        });
                      })()}
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {task.occupations && task.occupations.length > 0 ? (
                      task.occupations.map((occupation: any) => (
                        <Badge key={typeof occupation === 'number' ? occupation : occupation.id} variant="secondary" className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200">
                          {typeof occupation === 'number' ?
                            (occupations.find(t => t.id === occupation)?.name || `Equipe ${occupation}`) :
                            occupation.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhuma</span>
                    )}
                  </div>
                )}
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

                    <div className="border rounded-md p-2 text-sm w-full max-h-36 overflow-y-auto bg-blue-50/30 border-blue-200 space-y-1">
                      {/* Obter os IDs dos usuários selecionados */}
                      {(() => {
                        const selectedUserIds = editedTask.users ?
                          (Array.isArray(editedTask.users) ?
                            editedTask.users.map(u => typeof u === 'number' ? u : u.id) :
                            []) :
                          (Array.isArray(task.users) ?
                            task.users.map(u => typeof u === 'number' ? u : u.id) :
                            []);

                        // Obter usuários filtrados
                        const filteredUsers = getFilteredProjectUsers();

                        return filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => {
                            const isSelected = selectedUserIds.includes(user.id);

                            return (
                              <div key={user.id} className="flex items-center space-x-2 hover:bg-blue-100/50 p-1 rounded">
                                <Checkbox
                                  id={`user-${user.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const newSelectedUsers = [...selectedUserIds];
                                    if (checked) {
                                      // Adicionar usuário se não estiver selecionado
                                      if (!newSelectedUsers.includes(user.id)) {
                                        newSelectedUsers.push(user.id);
                                      }
                                    } else {
                                      // Remover usuário se estiver selecionado
                                      const index = newSelectedUsers.indexOf(user.id);
                                      if (index !== -1) {
                                        newSelectedUsers.splice(index, 1);
                                      }
                                    }
                                    handleFieldChange('users', newSelectedUsers);
                                  }}
                                />
                                <label
                                  htmlFor={`user-${user.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {user.name}
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {(() => {
                                      // Verificar se o usuário tem equipes
                                      if (user.occupations && user.occupations.length > 0) {
                                        // Se o usuário tem equipes, mostrar entre parênteses
                                        const teamNames = user.occupations.map((o: any) => {
                                          if (typeof o === 'number') {
                                            const team = occupations.find(t => t.id === o);
                                            return team ? team.name : `Equipe ${o}`;
                                          } else if (typeof o === 'object' && o.name) {
                                            return o.name;
                                          } else {
                                            return `Equipe ${o}`;
                                          }
                                        });
                                        return `(${teamNames.join(', ')})`;
                                      }
                                      // Verificar se o usuário tem uma ocupação
                                      else if (user.occupation && user.occupation.name) {
                                        return `(${user.occupation.name})`;
                                      }
                                      // Verificar se o usuário tem um occupation_id
                                      else if (user.occupation_id || user.occupationId) {
                                        const occupationId = user.occupation_id || user.occupationId;
                                        const team = occupations.find(t => t.id === occupationId);
                                        return team ? `(${team.name})` : '';
                                      }
                                      // Se não tem equipes, não mostrar nada
                                      else {
                                        return '';
                                      }
                                    })()}
                                  </span>
                                </label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground p-2 text-center">
                            Carregando usuários...
                          </div>
                        );
                      })()}
                    </div>

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

              {/* Revisor da Tarefa */}
              {task.reviewer && (
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="w-28">
                    <div className="text-sm font-medium">Revisor</div>
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="rounded-full bg-green-50 border-green-200 text-green-700">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-xs">
                            {task.reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{task.reviewer.name}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
              )}

              {/* Ordem - Oculto conforme solicitado */}
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
                    const dateString = item.createdAt; // Usar createdAt (camelCase) da API
                    let formattedDate = "Data inválida"; // Fallback
                    if (dateString) {
                      const date = parseISO(dateString);
                      if (isValid(date)) {
                        formattedDate = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
                      }
                    }

                    return (
                      <div key={`${isComment ? 'comment' : 'history'}-${item.id}`}>
                        {isComment ? (
                          // Renderizar o componente CommentItem para comentários
                          <CommentItem comment={item as ApiComment} parentTaskId={taskId} onReplySuccessfullyAdded={() => fetchTaskDetails(taskId!)} />
                        ) : (
                          // Renderizar a lógica existente para itens de histórico
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-secondary/80 text-secondary-foreground">
                                <History className="h-4 w-4" /> {/* ��cone de histórico */}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="font-medium">{item.user?.name || 'Sistema'}</span>
                                  <span className="text-muted-foreground ml-2 text-sm break-words" style={{ wordBreak: 'break-all' }}>
                                    {formatHistoryMessage(item as TaskHistoryItem)}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{formattedDate}</span>
                              </div>
                            </div>
                          </div>
                        )}
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
                    {authUser ? (
                      authUser.name && authUser.name.includes(' ') ?
                        authUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
                        (authUser.name ? authUser.name.substring(0, 2).toUpperCase() : 'U')
                    ) : 'U'}
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
                    disabled={!comment.trim() || isSubmittingComment}
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

      {/* Modal de Editor de Tela Cheia */}
      <FullScreenEditorModal
        isOpen={isFullScreenEditorOpen}
        onClose={() => setIsFullScreenEditorOpen(false)}
        content={editedTask.description !== undefined ? editedTask.description : task.description || ''}
        onSave={handleSaveFullScreenContent}
      />

      {/* Popup de Detalhes da Tarefa */}
      {task && (
        <TaskDetailsPopup
          isOpen={showDetailsPopup}
          onClose={() => setShowDetailsPopup(false)}
          task={task}
        />
      )}
    </Dialog>
  );
};

export default TaskDetailsModal;
