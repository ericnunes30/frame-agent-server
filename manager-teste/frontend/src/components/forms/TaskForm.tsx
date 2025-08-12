import React, { useState, useEffect, useCallback, useImperativeHandle } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Manter por enquanto, pode ser removido depois
import RichTextEditor from "@/components/ui/RichTextEditor";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UsersIcon, AlertTriangle, Trash2, Plus, ExternalLink, Video, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task, TaskStatus, User, Team } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { usePermissions } from '@/hooks/usePermissions';

import { debounce } from 'lodash'; // Importar a função debounce

// Schema de validação para o formulário
const taskFormSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres.",
  }),
  description: z.string().optional(),
  status: z.enum(['pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'aguardando_cliente', 'concluido', 'cancelado'] as const, {
    required_error: "Por favor selecione um status.",
  }),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente'] as const, {
    required_error: "Por favor selecione uma prioridade.",
  }),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
  project_id: z.number().optional(),
  user_ids: z.array(z.number()).optional(),
  occupation_ids: z.array(z.number()).optional(),
  task_reviewer_id: z.number().optional(),
  order: z.number().optional(), // Campo para a ordem da tarefa
  has_detailed_fields: z.boolean().optional(),
  video_url: z.string().url("URL inválida").or(z.literal("")).optional(),
  useful_links: z.array(z.object({
    title: z.string().min(1, "Título é obrigatório"),
    url: z.string().url("URL inválida")
  })).optional(),
  observations: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskFormProps {
  initialData?: Task;
  onSuccess: (data: Partial<Task>) => void;
  defaultProjectId?: number;
  defaultStatus?: TaskStatus;
  projectUsers?: User[];
  projectTeams?: Team[];
  isEditMode?: boolean; // Indica se o formulário está em modo de edição
  isDuplicateMode?: boolean; // Indica se o formulário está em modo de duplicação
  formInstanceId?: string; // Adicionado para rastrear a instância
}

export interface TaskFormRef {
  triggerSubmit: () => void;
}

export const TaskForm = React.forwardRef<TaskFormRef, TaskFormProps>(
  ({ initialData, onSuccess, defaultProjectId, defaultStatus, projectUsers, projectTeams, isEditMode = false, isDuplicateMode = false, formInstanceId }, ref) => {
  const statusLabels: Record<TaskStatus, string> = {
    pendente: "Pendente",
    a_fazer: "A Fazer",
    em_andamento: "Em Andamento",
    em_revisao: "Em Revisão",
    aguardando_cliente: "Aguardando Cliente",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDetailedFields, setShowDetailedFields] = useState<boolean>(
    initialData?.has_detailed_fields || false
  );
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [occupations, setOccupations] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Sincronizar showDetailedFields com o valor do form
  useEffect(() => {
    const hasDetailedFields = form.watch('has_detailed_fields');
    if (hasDetailedFields !== undefined) {
      setShowDetailedFields(hasDetailedFields);
    }
  }, [form.watch('has_detailed_fields')]);
  const permissions = usePermissions();
  const { projects: projectsService, tasks, users: usersService, teams: teamsService } = useBackendServices();
  const { mutate: createTaskMutation, isPending: isCreatePending } = tasks.useCreateTask();
  const { mutate: updateTaskMutation, isPending: isUpdatePending } = tasks.useUpdateTask();
  const { data: projectsQueryData = [] } = projectsService.useGetProjects();
  const { data: usersQueryData = [] } = usersService.useGetUsers();
  const { data: teamsQueryData = [] } = teamsService.useGetTeams();
  const { data: defaultProjectData } = projectsService.useGetProject(
    defaultProjectId as number,
    Boolean(defaultProjectId)
  );
  const { data: editProjectData } = projectsService.useGetProject(
    initialData?.project_id as number,
    isEditMode && Boolean(initialData?.project_id)
  );
  const isPending = isCreatePending || isUpdatePending;

  // Inicializa o formulário com zod resolver
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: isDuplicateMode && initialData?.title 
        ? `${initialData.title} - Cópia`
        : (initialData?.title || ""),
      description: initialData?.description || "",
      status: isDuplicateMode 
        ? (defaultStatus || "a_fazer") 
        : (initialData?.status || defaultStatus || "a_fazer"),
      priority: initialData?.priority || "media",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
      project_id: initialData?.project_id || defaultProjectId, // Garante que o nome do campo é 'project_id'
      user_ids: initialData?.users?.map(u => typeof u === 'number' ? u : u.id) || [],
      occupation_ids: initialData?.occupations?.map(o => typeof o === 'number' ? o : o.id) || [],
      task_reviewer_id: initialData?.task_reviewer_id || initialData?.taskReviewerId,
      order: isDuplicateMode ? undefined : initialData?.order, // Reset ordem no modo duplicação
      has_detailed_fields: initialData?.has_detailed_fields || false,
      video_url: initialData?.video_url || "",
      useful_links: initialData?.useful_links || [],
      observations: initialData?.observations || "",
    },
  });

  // Função para salvar automaticamente a tarefa
  const handleAutoSave = useCallback(async (values: TaskFormValues) => {
    // Prepara os dados de forma similar ao onSubmit, mas sem lógica de validação de dirty/isEditMode inicial
    const formattedValues = {
      ...values,
      start_date: values.start_date ? values.start_date.toISOString() : undefined,
      due_date: values.due_date ? values.due_date.toISOString() : undefined,
      users: values.user_ids,
      occupations: values.occupation_ids,
      task_reviewer_id: values.task_reviewer_id
    };

    let apiValues;

    // Lógica para determinar quais campos salvar com base nas permissões e modo de edição
    if (permissions.isMember && isEditMode) {
        apiValues = {
          status: formattedValues.status,
          description: formattedValues.description
        };
      } else {
        // Salvar todos os campos permitidos via auto-save
        apiValues = {
          title: formattedValues.title,
          description: formattedValues.description,
          status: formattedValues.status,
          priority: formattedValues.priority,
          start_date: formattedValues.start_date,
          due_date: formattedValues.due_date,
          project_id: formattedValues.project_id, // Garante que o nome do campo é 'project_id'
          users: formattedValues.users,
          occupations: formattedValues.occupations,
          // Novos campos detalhados
          has_detailed_fields: Boolean(values.has_detailed_fields),
          video_url: values.video_url && values.video_url.trim() !== '' ? values.video_url.trim() : null,
          useful_links: values.useful_links && values.useful_links.length > 0 && values.useful_links.some(link => link.title.trim() || link.url.trim()) ? values.useful_links.filter(link => link.title.trim() && link.url.trim()) : null,
          observations: values.observations && values.observations.trim() !== '' ? values.observations.trim() : null,
          // Não salvamos order aqui, pois só muda no kanban drag/drop
        };
      }

    // Chamamos a função de sucesso com os dados a serem salvos
    // É importante que onSuccess no componente pai saiba lidar com chamadas parciais (apenas status/description para membros)
    // O componente pai é responsável por lidar com a chamada API real e o feedback de loading/erro para o auto-save.
    onSuccess(apiValues);

  }, [onSuccess, permissions, isEditMode]); // Dependências do useCallback para handleAutoSave

  // Função debounceada para salvar automaticamente
  const debouncedAutoSave = useCallback(
    debounce((values: TaskFormValues) => {
      // Verificar se a tarefa já tem um ID antes de tentar salvar (evita salvar tarefas novas antes de serem criadas)
      // Desabilitar auto-save no modo duplicação
      if (initialData?.id && !isDuplicateMode) { // Só salva se a tarefa existir (modo de edição) e não estiver duplicando
         handleAutoSave(values);
      }
    }, 1000), // 1000ms = 1 segundo de debounce
    [handleAutoSave, initialData, isDuplicateMode] // Dependências do useCallback para debouncedAutoSave
  );

  // Efeito para observar mudanças no formulário e acionar o debounce
  useEffect(() => {
    // Assinar as mudanças no formulário
    const subscription = form.watch((values, { name, type }) => {
       // Acionar o auto-save debounceado em qualquer mudança no formulário
       // Passamos os valores atuais do formulário para a função debounceada
       debouncedAutoSave(values as TaskFormValues);
    });

    // Função de cleanup
    return () => {
      subscription.unsubscribe(); // Cancelar a observação ao desmontar
      debouncedAutoSave.cancel(); // Cancelar qualquer debounce pendente
    };
  }, [form, debouncedAutoSave]); // Dependências do useEffect

  // Efeito para limpar os estados quando o projeto muda
  useEffect(() => {
    // Limpar os estados anteriores para evitar que dados antigos sejam exibidos
    setUsers([]);
    setFilteredUsers([]);
    setAllUsers([]);
    setOccupations([]);
  }, [defaultProjectId]);

  // Inicializar os usuários filtrados com um array vazio para evitar erros
  useEffect(() => {
    if (!filteredUsers || !Array.isArray(filteredUsers)) {
      setFilteredUsers([]);
    }
  }, [filteredUsers]);

  // Função para filtrar usuários com base nas equipes selecionadas
  const filterUsersByOccupations = (occupationIds: number[]) => {

    // Garantir que allUsers seja um array válido
    if (!Array.isArray(allUsers)) {
      setFilteredUsers([]);
      return;
    }

    if (!occupationIds || !occupationIds.length) {
      // Se nenhuma ocupação for selecionada e temos um projeto padrão, mostrar apenas os usuários do projeto
      if (defaultProjectId && users.length > 0) {
        setFilteredUsers(users);
      } else {
        // Se não temos um projeto padrão, mostrar todos os usuários
        setFilteredUsers(allUsers);
      }
      return;
    }

    // Criar um mapa de IDs de usuários para evitar duplicatas
    const userIdMap = new Map();

    // Adicionar usuários das equipes selecionadas

    // Verificar usuários que têm a ocupação diretamente associada
    allUsers.forEach(user => {
      // Verificar se o usuário tem ocupações múltiplas
      if (user.occupations && Array.isArray(user.occupations)) {
        const hasSelectedOccupation = user.occupations.some(occ => {
          const occId = typeof occ === 'number' ? occ : occ.id;
          return occupationIds.includes(occId);
        });

        if (hasSelectedOccupation) {
          userIdMap.set(user.id, user);
        }
      }

      // Verificar se o usuário tem uma ocupação direta
      const userOccupationId = user.occupationId || user.occupation_id;
      if (userOccupationId && occupationIds.includes(userOccupationId)) {
        userIdMap.set(user.id, user);
      }

      // Verificar se o usuário tem um objeto de ocupação
      if (user.occupation && user.occupation.id && occupationIds.includes(user.occupation.id)) {
        userIdMap.set(user.id, user);
      }
    });

    // Converter o mapa de volta para um array
    const filtered = Array.from(userIdMap.values());

    setFilteredUsers(filtered);
  };

  // Carregar dados necessários para o formulário
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Carregar projetos
        const projectsData = projectsQueryData;

        const usersData = usersQueryData;
        setAllUsers(usersData || []);
        setFilteredUsers([]);

        if (projectUsers && projectUsers.length > 0) {
          const formattedUsers = projectUsers.map(user =>
            typeof user === 'number' ? { id: user, name: `Usuário ${user}`, email: '' } : user
          );
          setUsers(formattedUsers.map(u => ({ ...u, email: (u as User).email || '' }) as User));
          setFilteredUsers(formattedUsers.map(u => ({ ...u, email: (u as User).email || '' }) as User));
        } else if (defaultProjectId && defaultProjectData) {
          if (defaultProjectData.users && Array.isArray(defaultProjectData.users)) {
            const projectUsersList = defaultProjectData.users.map(user =>
              typeof user === 'number' ? { id: user, name: `Usuário ${user}`, email: '' } as User : { ...user, email: (user as User).email || '' } as User
            );
            setUsers(projectUsersList);
            setFilteredUsers(projectUsersList);
          } else {
            setUsers(usersData.map(u => ({ ...u, email: u.email || '' } as User)));
            setFilteredUsers([]);
          }
        } else {
          setUsers(usersData.map(u => ({ ...u, email: u.email || '' }) as User));
          setFilteredUsers([]);
        }

        if (isEditMode && initialData?.project_id && editProjectData) {
          let projectTeamsList: Team[] = editProjectData.occupations || [];

          if (!projectTeamsList.length && initialData.occupations && teamsQueryData.length > 0) {
            const taskOccupationIds = initialData.occupations.map(occ =>
              typeof occ === 'number' ? occ : occ.id
            );
            const taskOccupations = teamsQueryData.filter(team => taskOccupationIds.includes(team.id));
            projectTeamsList = taskOccupations;
          }

          setOccupations(
            projectTeamsList.map(team =>
              typeof team === 'number' ? { id: team, name: `Equipe ${team}` } : team
            )
          );
        } else if (projectTeams && projectTeams.length > 0) { // Assumindo que projectTeams agora contém dados de equipes
          const formattedTeams = projectTeams.map(team =>
            typeof team === 'number' ? { id: team, name: `Equipe ${team}` } : team
          );
          setOccupations(formattedTeams);
        } else if (defaultProjectId && defaultProjectData) {
          if (defaultProjectData.occupations && defaultProjectData.occupations.length > 0) {
            setOccupations(
              defaultProjectData.occupations.map(team =>
                typeof team === 'number' ? { id: team, name: `Equipe ${team}` } : team
              )
            );
          } else {
            setOccupations(teamsQueryData);
          }
        } else {
          setOccupations(teamsQueryData);
        }

        if (defaultProjectId) {
          form.setValue('project_id', defaultProjectId);
        }

        if (defaultStatus) {
          form.setValue('status', defaultStatus as TaskStatus);
        }

        // Se temos um projeto padrão, pré-selecionar ele no formulário
        if (defaultProjectId) {
          form.setValue('project_id', defaultProjectId);
        }

        // Se temos um status padrão, pré-selecionar ele no formulário
        if (defaultStatus) {
          form.setValue('status', defaultStatus as TaskStatus);
        }
      } catch (error) {
        toast.error("Erro ao carregar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    defaultProjectId,
    defaultStatus,
    initialData?.id,
    projectsQueryData,
    usersQueryData,
    teamsQueryData,
    projectUsers,
    projectTeams,
    isEditMode,
    defaultProjectData,
    editProjectData,
  ]);

  // Efeito para filtrar usuários quando as equipes selecionadas mudarem
  useEffect(() => {
    const selectedOccupations = form.watch('occupation_ids') || [];

    // Garantir que temos dados válidos antes de filtrar
    if (Array.isArray(occupations) && occupations.length > 0 && Array.isArray(allUsers)) {
      filterUsersByOccupations(selectedOccupations);

      // Limpar usuários selecionados que não pertencem às ocupações selecionadas
      if (selectedOccupations.length > 0) {
        const currentUsers = form.watch('user_ids') || [];
        if (currentUsers.length > 0) {
          // Verificar se os usuários selecionados estão nas ocupações selecionadas
          setTimeout(() => {
            if (Array.isArray(filteredUsers)) {
              const validUserIds = filteredUsers.map(u => u.id);
              const validSelectedUsers = currentUsers.filter(userId => validUserIds.includes(userId));

              if (validSelectedUsers.length !== currentUsers.length) {
                form.setValue('user_ids', validSelectedUsers);
              }
            }
          }, 100);
        }
      }
    }
  }, [form.watch('occupation_ids'), occupations, allUsers, filteredUsers, form, filterUsersByOccupations]);

  // Função para obter as equipes de um usuário
  const getUserOccupations = (user: User) => {
    if (!user) return 'Sem equipe';

    let teamNames: string[] = [];

    try {
      // Verificar se o usuário tem equipes múltiplas (mapear de occupations para teams)
      if (user.occupations && Array.isArray(user.occupations) && user.occupations.length > 0) {
        // Mapear IDs de equipes para nomes
        teamNames = user.occupations.map((teamIdOrObject: number | Team) => {
          const teamId = typeof teamIdOrObject === 'number' ? teamIdOrObject : teamIdOrObject.id;
          const team = occupations.find(t => t.id === teamId); // 'occupations' aqui é na verdade 'teams'
          return team ? team.name : `Equipe ${teamId}`;
        });
      }

      // Verificar se o usuário tem uma equipe direta
      const userOccupationId = user.occupationId || user.occupation_id;
      if (userOccupationId && teamNames.length === 0) {
        const team = occupations.find(t => t.id === userOccupationId);
        if (team) teamNames.push(team.name);
      }

      // Verificar se o usuário tem um objeto de equipe
      if (user.occupation && user.occupation.id && teamNames.length === 0) {
        const team = occupations.find(t => t.id === user.occupation.id);
        if (team) {
          teamNames.push(team.name);
        } else if (user.occupation.name) {
          teamNames.push(user.occupation.name);
        }
      }

      if (teamNames.length === 0) {
        return 'Sem equipe';
      }

      return teamNames.join(', ');
    } catch (error) {
      return 'Sem equipe';
    }
  };

  const onSubmit = (values: TaskFormValues) => {
    if (!form.formState.isDirty && isEditMode) {
      toast.info("Nenhuma alteração foi feita");
      return;
    }

    // Converter datas para string no formato ISO
    const formattedValues = {
      ...values,
      start_date: values.start_date ? values.start_date.toISOString() : undefined,
      due_date: values.due_date ? values.due_date.toISOString() : undefined,
      users: values.user_ids?.filter(id => typeof id === 'number' && id > 0),
      occupations: values.occupation_ids?.filter(id => typeof id === 'number' && id > 0),
      task_reviewer_id: values.task_reviewer_id
    };

    // Se o usuário for um membro e estiver em modo de edição, permitir apenas atualizar status e comentário
    let apiValues;

    if (permissions.isMember && isEditMode) {
      apiValues = {
        status: formattedValues.status,
        description: formattedValues.description
      };
    } else {
      apiValues = {
        title: formattedValues.title,
        description: formattedValues.description,
        status: formattedValues.status,
        priority: formattedValues.priority,
        start_date: formattedValues.start_date,
        due_date: formattedValues.due_date,
        project_id: formattedValues.project_id, // Garante que o nome do campo é 'project_id'
        task_reviewer_id: formattedValues.task_reviewer_id,
        users: formattedValues.users,
        occupations: formattedValues.occupations,
        order: values.order,
        // Novos campos detalhados
        has_detailed_fields: Boolean(values.has_detailed_fields),
        video_url: values.video_url && values.video_url.trim() !== '' ? values.video_url.trim() : null,
        useful_links: values.useful_links && values.useful_links.length > 0 && values.useful_links.some(link => link.title.trim() || link.url.trim()) ? values.useful_links.filter(link => link.title.trim() && link.url.trim()) : null,
        observations: values.observations && values.observations.trim() !== '' ? values.observations.trim() : null
      };
    }

    if (isEditMode && initialData?.id) {
      updateTaskMutation(
        { id: initialData.id, data: apiValues },
        {
          onSuccess: (data) => {
            onSuccess(data);
          },
          onError: () => {
            toast.error('Erro ao processar formulário. Tente novamente.');
          },
        }
      );
    } else {
      createTaskMutation(apiValues, {
        onSuccess: (data) => {
          onSuccess(data);
        },
        onError: (error) => {
          toast.error('Erro ao processar formulário. Tente novamente.');
        },
      });
    }
  };

  // Expor a função de submit via ref
  useImperativeHandle(ref, () => ({
    triggerSubmit: () => {
      form.handleSubmit(onSubmit)();
    }
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite o título da tarefa"
                  {...field}
                  disabled={permissions.isMember && isEditMode}
                />
              </FormControl>
              {permissions.isMember && isEditMode && (
                <FormDescription className="text-xs text-muted-foreground mt-1">
                  Como membro, você não pode alterar o título da tarefa.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <RichTextEditor
                  content={field.value || ""}
                  onChange={field.onChange}
                  editable={!permissions.isMember || !isEditMode} // Membros podem editar a descrição apenas se não estiverem em modo de edição
                />
              </FormControl>
              <FormDescription>
                Detalhes completos da tarefa.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loading || isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      {/* Exibe o rótulo formatado ou o placeholder */}
                      <SelectValue placeholder="Selecione o status">
                        {field.value ? statusLabels[field.value as TaskStatus] : "Selecione o status"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem> {/* Adicionada opção Pendente */}
                    <SelectItem value="a_fazer">A Fazer</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="em_revisao">Em Revisão</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={loading || isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={loading || isPending || (permissions.isMember && isEditMode)}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={loading || isPending}
                    />
                  </PopoverContent>
                </Popover>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar a data de início da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Prazo</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={loading || isPending || (permissions.isMember && isEditMode)}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={loading || isPending}
                    />
                  </PopoverContent>
                </Popover>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar o prazo da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value && value !== "0" ? parseInt(value) : undefined)}
                  value={field.value?.toString()}
                  disabled={!!isEditMode || !!defaultProjectId || loading || permissions.isMember} // Desabilitar o campo quando estiver em modo de edição, quando tiver um projeto padrão, quando for membro ou carregando
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Sem projeto</SelectItem>
                    {projectsQueryData.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(isEditMode || defaultProjectId || permissions.isMember) && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    {isEditMode
                      ? "O projeto não pode ser alterado durante a edição da tarefa."
                      : permissions.isMember
                        ? "Como membro, você não pode alterar o projeto da tarefa."
                        : "O projeto não pode ser alterado quando a tarefa é criada dentro de um projeto específico."}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="occupation_ids"
            render={() => (
              <FormItem className="h-full">
                <FormLabel>Equipes da Tarefa</FormLabel>
                <Card className="h-[calc(100%-2rem)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Ocupações
                      </div>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Selecione as ocupações associadas à tarefa.
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {occupations.length > 0 ? (
                      occupations.map((occupation) => (
                        <div key={occupation.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`occupation-${occupation.id}`}
                            checked={form.watch('occupation_ids')?.includes(occupation.id)}
                            onCheckedChange={(checked) => {
                              const currentOccupations = form.watch('occupation_ids') || [];
                              const newOccupations = checked
                                ? [...currentOccupations, occupation.id]
                                : currentOccupations.filter(id => id !== occupation.id);
                              form.setValue('occupation_ids', newOccupations);

                              // Filtrar usuários com base nas ocupações selecionadas
                              filterUsersByOccupations(newOccupations);
                            }}
                            disabled={loading || isPending || (permissions.isMember && isEditMode)}
                          />
                          <label
                            htmlFor={`occupation-${occupation.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {occupation.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma ocupação disponível.
                      </p>
                    )}
                  </CardContent>
                </Card>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar as equipes da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_ids"
            render={() => (
              <FormItem className="h-full">
                <FormLabel>Responsáveis da Tarefa</FormLabel>
                <Card className="h-[calc(100%-2rem)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Adicionar Responsáveis à Tarefa
                      </div>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Selecione os usuários que serão responsáveis por esta tarefa.
                      {form.watch('occupation_ids')?.length === 0 && (
                        <div className="mt-2 text-xs text-amber-500"> {/* Substituído <p> por <div> */}
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {defaultProjectId
                            ? "Selecione equipes do projeto para ver os usuários disponíveis."
                            : "Selecione equipes primeiro para ver os usuários disponíveis."}
                        </div>
                      )}
                    </div> {/* Substituído CardDescription por <div> */}
                  </CardHeader>
                  <CardContent className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2 py-1 px-2 hover:bg-muted/50 rounded-md">
                          <Checkbox
                            checked={form.watch('user_ids')?.includes(user.id)}
                            onCheckedChange={(checked) => {
                              const currentUsers = form.watch('user_ids') || [];
                              const newUsers = checked
                                ? [...currentUsers, user.id]
                                : currentUsers.filter(id => id !== user.id);
                              form.setValue('user_ids', newUsers);
                            }}
                            disabled={loading || isPending || (permissions.isMember && isEditMode)}
                          />
                          <label className="flex items-center gap-2 w-full overflow-hidden">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarFallback>
                                {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'UN'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{user.name}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {getUserOccupations(user)}
                              </span>
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {form.watch('occupation_ids')?.length > 0
                          ? "Nenhum usuário encontrado nas equipes selecionadas."
                          : defaultProjectId
                            ? "Selecione equipes do projeto para ver os usuários disponíveis."
                            : "Selecione equipes primeiro para ver os usuários disponíveis."}
                      </p>
                    )}
                  </CardContent>
                </Card>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar os responsáveis da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Campo Revisor da Tarefa */}
        <FormField
          control={form.control}
          name="task_reviewer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Revisor da Tarefa
              </FormLabel>
              <FormControl>
                <Select 
                  onValueChange={(value) => field.onChange(value === "none" ? undefined : Number(value))}
                  value={field.value?.toString() || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um revisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum revisor</SelectItem>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Usuário responsável por revisar esta tarefa quando necessário
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggle para campos detalhados */}
        <FormField
          control={form.control}
          name="has_detailed_fields"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Campos Detalhados
                </FormLabel>
                <FormDescription>
                  Adicionar vídeo explicativo, links úteis e observações detalhadas
                  {isEditMode && !initialData?.has_detailed_fields && (
                    <div className="mt-1 text-sm text-amber-600">
                      Esta tarefa não possui campos detalhados. Ative para adicionar informações extras.
                    </div>
                  )}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    setShowDetailedFields(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Campos detalhados condicionais */}
        {showDetailedFields && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes Adicionais
              </CardTitle>
              <CardDescription>
                Adicione informações extras para esta tarefa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL do Vídeo */}
              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      URL do Vídeo (YouTube)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL de um vídeo do YouTube para explicar a tarefa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Links Úteis */}
              <FormField
                control={form.control}
                name="useful_links"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Links Úteis
                    </FormLabel>
                    <div className="space-y-3">
                      {field.value?.map((link, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              placeholder="Título do link"
                              value={link.title}
                              onChange={(e) => {
                                const newLinks = [...(field.value || [])];
                                newLinks[index] = { ...newLinks[index], title: e.target.value };
                                field.onChange(newLinks);
                              }}
                              className="mb-2"
                            />
                            <Input
                              placeholder="https://..."
                              value={link.url}
                              onChange={(e) => {
                                const newLinks = [...(field.value || [])];
                                newLinks[index] = { ...newLinks[index], url: e.target.value };
                                field.onChange(newLinks);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newLinks = field.value?.filter((_, i) => i !== index) || [];
                              field.onChange(newLinks);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newLinks = [...(field.value || []), { title: '', url: '' }];
                          field.onChange(newLinks);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Link
                      </Button>
                    </div>
                    <FormDescription>
                      Links para recursos, documentação ou referências
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observações */}
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Detalhadas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações, requisitos técnicos, considerações especiais..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Informações adicionais que podem ser úteis para a execução da tarefa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Campo oculto para preservar a ordem */}
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <input type="hidden" {...field} value={field.value || ''} />
          )}
        />

        <div className="flex justify-between gap-2">
          {isEditMode && !permissions.isMember && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => onSuccess({})}
              disabled={loading || isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
          {/* Botão de submit oculto para ser acionado pelos botões externos, com ID dinâmico */}
          <Button type="submit" className="hidden" id={`task-form-submit-${formInstanceId || 'default'}`}>
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
});
