import api from './axios';

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pendente' | 'a_fazer' | 'em_andamento' | 'em_revisao' | 'concluido';

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string; // Campo interno no frontend
  due_date?: string; // Campo interno no frontend
  startDate?: string; // Campo usado pela API
  dueDate?: string; // Campo usado pela API
  project_id?: number; // Campo interno no frontend
  projectId?: number; // Campo usado pela API
  order?: number;
  created_at?: string; // Campo interno no frontend
  updated_at?: string; // Campo interno no frontend
  createdAt?: string; // Campo usado pela API
  updatedAt?: string; // Campo usado pela API
  users?: Array<number | { id: number; name: string; email: string; occupation_id?: number; occupationId?: number }>;
  occupations?: Array<number | { id: number; name: string }>;
  project?: {
    id: number;
    title: string;
    description: string;
    status: boolean;
    priority: string;
    startDate?: string;
    endDate?: string;
    start_date?: string;
    end_date?: string;
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string; // Campo interno no frontend
  due_date?: string; // Campo interno no frontend
  startDate?: string; // Campo usado pela API
  dueDate?: string; // Campo usado pela API
  project_id?: number; // Campo interno no frontend
  projectId?: number; // Campo usado pela API
  order?: number;
  users?: number[];
  occupations?: number[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  start_date?: string; // Campo interno no frontend
  due_date?: string; // Campo interno no frontend
  startDate?: string; // Campo usado pela API
  dueDate?: string; // Campo usado pela API
  project_id?: number; // Campo interno no frontend
  projectId?: number; // Campo usado pela API
  order?: number;
  users?: number[];
  occupations?: number[];
}

const taskService = {
  // Listar todas as tarefas
  getTasks: async () => {
    const response = await api.get<Task[]>('/task');

    // Converter os nomes dos campos da API para o formato usado no frontend
    const tasksData = response.data;
    const convertedTasks: Task[] = tasksData.map(convertApiTaskToFrontend);

    return convertedTasks;
  },

  // Obter uma tarefa específica
  getTask: async (id: number) => {
    // Garantir que o ID seja um número válido
    const taskId = Number(id);
    if (isNaN(taskId) || taskId <= 0) {
      throw new Error(`ID de tarefa inválido: ${id}`);
    }

    console.log(`Enviando requisição GET para /task/${taskId}`);
    const response = await api.get<Task>(`/task/${taskId}`);

    // Converter os nomes dos campos da API para o formato usado no frontend
    const taskData = response.data;
    const convertedTask = convertApiTaskToFrontend(taskData);

    return convertedTask;
  },

  // Criar uma nova tarefa
  createTask: async (taskData: CreateTaskRequest) => {
    // Usar diretamente os nomes de campos que o backend espera
    const apiTaskData: any = { ...taskData };

    // Converter startDate para start_date (se existir)
    if (taskData.startDate !== undefined) {
      apiTaskData.start_date = taskData.startDate;
      delete apiTaskData.startDate;
      console.log('Usando startDate como start_date:', apiTaskData.start_date);
    }

    // Converter dueDate para due_date (se existir)
    if (taskData.dueDate !== undefined) {
      apiTaskData.due_date = taskData.dueDate;
      delete apiTaskData.dueDate;
      console.log('Usando dueDate como due_date:', apiTaskData.due_date);
    }

    // Converter projectId para project_id (se existir)
    if (taskData.projectId !== undefined) {
      apiTaskData.project_id = Number(taskData.projectId);
      delete apiTaskData.projectId;
      console.log('Usando projectId como project_id:', apiTaskData.project_id);
    }

    // Garantir que users e occupations sejam arrays de números
    if (apiTaskData.users) {
      apiTaskData.users = apiTaskData.users.map(id => Number(id));
    }

    if (apiTaskData.occupations) {
      apiTaskData.occupations = apiTaskData.occupations.map(id => Number(id));
    }

    console.log(`Enviando requisição POST para /task com dados:`, apiTaskData);
    const response = await api.post<Task>('/task', apiTaskData);

    // Converter os nomes dos campos da API para o formato usado no frontend
    return convertApiTaskToFrontend(response.data);
  },

  // Atualizar uma tarefa existente
  updateTask: async (id: number, taskData: UpdateTaskRequest) => {
    // Garantir que o ID seja um número válido
    const taskId = Number(id);
    if (isNaN(taskId) || taskId <= 0) {
      throw new Error(`ID de tarefa inválido: ${id}`);
    }

    // Usar diretamente os nomes de campos que o backend espera
    const apiTaskData: any = { ...taskData };

    // Converter startDate para start_date (se existir)
    if (taskData.startDate !== undefined) {
      apiTaskData.start_date = taskData.startDate;
      delete apiTaskData.startDate;
      console.log('Usando startDate como start_date:', apiTaskData.start_date);
    }

    // Converter dueDate para due_date (se existir)
    if (taskData.dueDate !== undefined) {
      apiTaskData.due_date = taskData.dueDate;
      delete apiTaskData.dueDate;
      console.log('Usando dueDate como due_date:', apiTaskData.due_date);
    }

    // Converter projectId para project_id (se existir)
    if (taskData.projectId !== undefined) {
      apiTaskData.project_id = Number(taskData.projectId);
      delete apiTaskData.projectId;
      console.log('Usando projectId como project_id:', apiTaskData.project_id);
    }

    // Garantir que users e occupations sejam arrays de números
    if (apiTaskData.users) {
      apiTaskData.users = apiTaskData.users.map(id => Number(id));
    }

    if (apiTaskData.occupations) {
      apiTaskData.occupations = apiTaskData.occupations.map(id => Number(id));
    }

    // Verificar se estamos fazendo uma atualização parcial ou completa
    const isPartialUpdate = !['title', 'status', 'priority'].every(field => apiTaskData[field] !== undefined);

    // Se for uma atualização parcial, usar PATCH
    if (isPartialUpdate) {
      console.log(`Enviando requisição PATCH para /task/${taskId} com dados:`, apiTaskData);
      const response = await api.patch<Task>(`/task/${taskId}`, apiTaskData);
      return convertApiTaskToFrontend(response.data);
    } else {
      // Para atualizações completas, verificar campos obrigatórios e usar PUT
      const requiredFields = ['title', 'status', 'priority'];
      const missingFields = requiredFields.filter(field => apiTaskData[field] === undefined);

      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
      }

      console.log(`Enviando requisição PUT para /task/${taskId} com dados:`, apiTaskData);
      const response = await api.put<Task>(`/task/${taskId}`, apiTaskData);
      return convertApiTaskToFrontend(response.data);
    }
  },

  // Excluir uma tarefa
  deleteTask: async (id: number) => {
    // Garantir que o ID seja um número válido
    const taskId = Number(id);
    if (isNaN(taskId) || taskId <= 0) {
      throw new Error(`ID de tarefa inválido: ${id}`);
    }

    console.log(`Enviando requisição DELETE para /task/${taskId}`);
    const response = await api.delete(`/task/${taskId}`);
    return response.data;
  },

  // Obter tarefas de um projeto específico
  getTasksByProject: async (projectId: number) => {
    // Garantir que o ID seja um número válido
    const id = Number(projectId);
    if (isNaN(id) || id <= 0) {
      throw new Error(`ID de projeto inválido: ${projectId}`);
    }

    console.log(`Enviando requisição GET para /task?projectId=${id}`);
    const response = await api.get<Task[]>(`/task?projectId=${id}`);

    // Converter os nomes dos campos da API para o formato usado no frontend
    const tasksData = response.data;
    const convertedTasks: Task[] = tasksData.map(convertApiTaskToFrontend);

    return convertedTasks;
  }
};

// Função utilitária para converter os nomes dos campos da API para o formato usado no frontend
export const convertApiTaskToFrontend = (taskData: Task): Task => ({
  ...taskData,
  // Converter startDate para start_date
  start_date: taskData.startDate || taskData.start_date,
  // Converter dueDate para due_date
  due_date: taskData.dueDate || taskData.due_date,
  // Converter projectId para project_id
  project_id: taskData.projectId || taskData.project_id,
  // Converter createdAt para created_at
  created_at: taskData.createdAt || taskData.created_at,
  // Converter updatedAt para updated_at
  updated_at: taskData.updatedAt || taskData.updated_at
});

export default taskService;
