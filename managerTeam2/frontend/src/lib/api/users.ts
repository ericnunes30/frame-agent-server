import api from './axios';

export interface User {
  id: number;
  name: string;
  email: string;
  occupation_id?: number;
  occupationId?: number; // Suporte para formato camelCase
  created_at?: string;
  createdAt?: string; // Suporte para formato camelCase
  updated_at?: string;
  updatedAt?: string; // Suporte para formato camelCase
  roles?: number[];
  occupation?: {
    id: number;
    name: string;
  };
  occupations?: Array<{
    id: number;
    name: string;
  }>;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  occupation_id?: number;
  roles?: number[];
  occupations?: number[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  occupation_id?: number;
  roles?: number[];
  occupations?: number[];
}

const userService = {
  // Listar todos os usuários
  getUsers: async () => {
    const response = await api.get<User[]>('/user');
    return response.data;
  },

  // Obter um usuário específico
  getUser: async (id: number) => {
    const response = await api.get<User>(`/user/${id}`);
    return response.data;
  },

  // Criar um novo usuário
  createUser: async (userData: CreateUserRequest) => {
    const response = await api.post<User>('/user', userData);
    return response.data;
  },

  // Atualizar um usuário existente
  updateUser: async (id: number, userData: UpdateUserRequest) => {
    const response = await api.put<User>(`/user/${id}`, userData);
    return response.data;
  },

  // Excluir um usuário
  deleteUser: async (id: number) => {
    const response = await api.delete(`/user/${id}`);
    return response.data;
  }
};

export default userService;
