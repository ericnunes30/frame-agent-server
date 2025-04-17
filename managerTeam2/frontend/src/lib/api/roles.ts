import api from './axios';

export interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

const roleService = {
  // Listar todas as funções
  getRoles: async () => {
    const response = await api.get<Role[]>('/role');
    return response.data;
  },

  // Obter uma função específica
  getRole: async (id: number) => {
    const response = await api.get<Role>(`/role/${id}`);
    return response.data;
  },

  // Criar uma nova função
  createRole: async (roleData: CreateRoleRequest) => {
    const response = await api.post<Role>('/role', roleData);
    return response.data;
  },

  // Atualizar uma função existente
  updateRole: async (id: number, roleData: UpdateRoleRequest) => {
    const response = await api.put<Role>(`/role/${id}`, roleData);
    return response.data;
  },

  // Excluir uma função
  deleteRole: async (id: number) => {
    const response = await api.delete(`/role/${id}`);
    return response.data;
  }
};

export default roleService;
