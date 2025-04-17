import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Task, TaskPriority, TaskStatus, projectService, userService, teamService } from '@/lib/api';

// Schema de validação para o formulário
const taskFormSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres.",
  }),
  description: z.string().optional(),
  status: z.enum(['pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'concluido'] as const, {
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
  order: z.number().optional(), // Campo para a ordem da tarefa
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskFormProps {
  initialData?: Task;
  onSuccess: (data: Partial<Task>) => void;
  submitButtonText?: string;
  defaultProjectId?: number;
  defaultStatus?: TaskStatus;
  projectUsers?: any[];
  projectTeams?: any[];
  isEditMode?: boolean; // Indica se o formulário está em modo de edição
}

export function TaskForm({ initialData, onSuccess, submitButtonText = "Salvar", defaultProjectId, defaultStatus, projectUsers, projectTeams, isEditMode = false }: TaskFormProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Inicializa o formulário com zod resolver
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: initialData?.status || defaultStatus || "a_fazer",
      priority: initialData?.priority || "media",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
      project_id: initialData?.project_id || defaultProjectId,
      user_ids: initialData?.users?.map(u => typeof u === 'number' ? u : u.id) || [],
      occupation_ids: initialData?.occupations?.map(o => typeof o === 'number' ? o : o.id) || [],
      order: initialData?.order, // Preservar a ordem da tarefa se existir
    },
  });

  // Carregar dados necessários para o formulário
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Carregar projetos
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);

        // Se estamos dentro de um projeto e temos usuários e equipes do projeto
        if (projectUsers && projectUsers.length > 0) {
          console.log('Usando usuários do projeto:', projectUsers);
          setUsers(projectUsers);
        } else {
          // Carregar todos os usuários
          const usersData = await userService.getUsers();
          setUsers(usersData);
        }

        // Se estamos dentro de um projeto e temos equipes do projeto
        if (projectTeams && projectTeams.length > 0) {
          console.log('Usando equipes do projeto:', projectTeams);
          setTeams(projectTeams);
        } else {
          // Carregar todas as equipes
          const teamsData = await teamService.getTeams();
          setTeams(teamsData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados para o formulário:", error);
        toast.error("Erro ao carregar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectUsers, projectTeams]);

  const onSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    try {
      // Converter datas para string no formato ISO
      const formattedValues = {
        ...values,
        start_date: values.start_date ? values.start_date.toISOString() : undefined,
        due_date: values.due_date ? values.due_date.toISOString() : undefined,
        users: values.user_ids,
        occupations: values.occupation_ids
      };

      // Remover campos que não são aceitos pela API
      const apiValues = {
        title: formattedValues.title,
        description: formattedValues.description,
        status: formattedValues.status,
        priority: formattedValues.priority,
        start_date: formattedValues.start_date,
        due_date: formattedValues.due_date,
        project_id: formattedValues.project_id,
        users: formattedValues.users,
        occupations: formattedValues.occupations,
        order: values.order // Preservar a ordem da tarefa
      };

      onSuccess(apiValues);
    } catch (error) {
      console.error("Erro ao processar formulário:", error);
      toast.error("Erro ao processar formulário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Digite o título da tarefa" {...field} />
              </FormControl>
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
                <Textarea
                  placeholder="Descreva a tarefa em detalhes"
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
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
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
                    />
                  </PopoverContent>
                </Popover>
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
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Projeto</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value && value !== "0" ? parseInt(value) : undefined)}
                value={field.value?.toString()}
                disabled={isEditMode} // Desabilitar o campo quando estiver em modo de edição
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Sem projeto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditMode && (
                <FormDescription className="text-xs text-muted-foreground mt-1">
                  O projeto não pode ser alterado durante a edição da tarefa.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="user_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsáveis</FormLabel>
              <Select
                onValueChange={(value) => {
                  const userId = parseInt(value);
                  if (!field.value?.includes(userId)) {
                    field.onChange([...(field.value || []), userId]);
                  }
                }}
                value="select"
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar responsável" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value?.map((userId) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                    >
                      {user ? user.name : `Usuário ${userId}`}
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(field.value?.filter((id) => id !== userId));
                        }}
                        className="text-secondary-foreground/70 hover:text-secondary-foreground"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="occupation_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipes</FormLabel>
              <Select
                onValueChange={(value) => {
                  const teamId = parseInt(value);
                  if (!field.value?.includes(teamId)) {
                    field.onChange([...(field.value || []), teamId]);
                  }
                }}
                value="select"
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar equipe" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value?.map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  return (
                    <div
                      key={teamId}
                      className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm"
                    >
                      {team ? team.name : `Equipe ${teamId}`}
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(field.value?.filter((id) => id !== teamId));
                        }}
                        className="text-primary-foreground/70 hover:text-primary-foreground"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo oculto para preservar a ordem */}
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <input type="hidden" {...field} value={field.value || ''} />
          )}
        />

        <Button type="submit" disabled={loading}>
          {loading ? "Carregando..." : submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
