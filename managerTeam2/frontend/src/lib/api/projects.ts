import api from './axios';

export type ProjectPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Project {
  id: number;
  title: string;
  description: string;
  priority: ProjectPriority;
  status: boolean;
  // Campos internos no frontend
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  // Campos da API
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relacionamentos
  users?: Array<number | { id: number; name: string; email: string; occupationId?: number }>;
  occupations?: Array<number | { id: number; name: string; createdAt?: string; updatedAt?: string }>;
  tasks?: Array<{
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    startDate?: string;
    dueDate?: string;
    projectId?: number;
    order?: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  priority: ProjectPriority;
  status: boolean;
  start_date: string;
  end_date: string;
  users?: number[];
  occupations?: number[];
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  priority?: ProjectPriority;
  status?: boolean;
  start_date?: string;
  end_date?: string;
  users?: number[];
  occupations?: number[];
}

const projectService = {
  // Listar todos os projetos
  getProjects: async () => {
    const response = await api.get<Project[]>('/project');
    // Converter os nomes dos campos da API para o formato usado no frontend
    return response.data.map(convertApiProjectToFrontend);
  },

  // Obter um projeto específico
  getProject: async (id: number) => {
    const response = await api.get<Project>(`/project/${id}`);
    // Converter os nomes dos campos da API para o formato usado no frontend
    return convertApiProjectToFrontend(response.data);
  },

  // Criar um novo projeto
  createProject: async (projectData: CreateProjectRequest) => {
    // Converter os nomes dos campos do frontend para o formato usado pela API
    const apiProjectData: any = { ...projectData };

    // Converter start_date para startDate
    if (projectData.start_date) {
      apiProjectData.startDate = projectData.start_date;
      delete apiProjectData.start_date;
    }

    // Converter end_date para endDate
    if (projectData.end_date) {
      apiProjectData.endDate = projectData.end_date;
      delete apiProjectData.end_date;
    }

    const response = await api.post<Project>('/project', apiProjectData);
    // Converter os nomes dos campos da API para o formato usado no frontend
    return convertApiProjectToFrontend(response.data);
  },

  // Atualizar um projeto existente
  updateProject: async (id: number, projectData: UpdateProjectRequest) => {
    // Converter os nomes dos campos do frontend para o formato usado pela API
    const apiProjectData: any = { ...projectData };

    // Converter start_date para startDate
    if (projectData.start_date) {
      apiProjectData.startDate = projectData.start_date;
      delete apiProjectData.start_date;
    }

    // Converter end_date para endDate
    if (projectData.end_date) {
      apiProjectData.endDate = projectData.end_date;
      delete apiProjectData.end_date;
    }

    const response = await api.put<Project>(`/project/${id}`, apiProjectData);
    // Converter os nomes dos campos da API para o formato usado no frontend
    return convertApiProjectToFrontend(response.data);
  },

  // Excluir um projeto
  deleteProject: async (id: number) => {
    const response = await api.delete(`/project/${id}`);
    return response.data;
  }
};

// Função utilitária para converter os nomes dos campos da API para o formato usado no frontend
export const convertApiProjectToFrontend = (projectData: Project): Project => {
  // Criar uma cópia do objeto para não modificar o original
  const convertedProject: Project = {
    ...projectData,
    // Converter startDate para start_date
    start_date: projectData.startDate || projectData.start_date,
    // Converter endDate para end_date
    end_date: projectData.endDate || projectData.end_date,
    // Converter createdAt para created_at
    created_at: projectData.createdAt || projectData.created_at,
    // Converter updatedAt para updated_at
    updated_at: projectData.updatedAt || projectData.updated_at,
  };

  // Preservar os relacionamentos
  if (projectData.users) {
    convertedProject.users = projectData.users;
  }

  if (projectData.occupations) {
    convertedProject.occupations = projectData.occupations;
  }

  if (projectData.tasks) {
    convertedProject.tasks = projectData.tasks;
  }

  return convertedProject;
};

export default projectService;
