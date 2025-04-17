import api from './axios';

export interface Occupation {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOccupationRequest {
  name: string;
  description: string;
}

export interface UpdateOccupationRequest {
  name?: string;
  description?: string;
}

export interface AddUserToOccupationRequest {
  user_id: number;
}

const occupationService = {
  // Listar todas as ocupações
  getOccupations: async () => {
    const response = await api.get<Occupation[]>('/occupation');
    return response.data;
  },

  // Obter uma ocupação específica
  getOccupation: async (id: number) => {
    const response = await api.get<Occupation>(`/occupation/${id}`);
    return response.data;
  },

  // Criar uma nova ocupação
  createOccupation: async (occupationData: CreateOccupationRequest) => {
    const response = await api.post<Occupation>('/occupation', occupationData);
    return response.data;
  },

  // Atualizar uma ocupação existente
  updateOccupation: async (id: number, occupationData: UpdateOccupationRequest) => {
    const response = await api.put<Occupation>(`/occupation/${id}`, occupationData);
    return response.data;
  },

  // Excluir uma ocupação
  deleteOccupation: async (id: number) => {
    const response = await api.delete(`/occupation/${id}`);
    return response.data;
  },

  // Adicionar usuário a uma ocupação
  addUserToOccupation: async (occupationId: number, userData: AddUserToOccupationRequest) => {
    const response = await api.post<any>(`/user/${userData.user_id}`, { occupationId });
    return response.data;
  },

  // Remover usuário de uma ocupação
  removeUserFromOccupation: async (occupationId: number, userId: number) => {
    const response = await api.put<any>(`/user/${userId}`, { occupationId: null });
    return response.data;
  }
};

export default occupationService;
