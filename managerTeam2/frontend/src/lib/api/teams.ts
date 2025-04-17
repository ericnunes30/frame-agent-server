import api from './axios';
import { User } from './users';
import { Occupation } from './occupations';

export interface Team {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  users?: User[];
}

export interface TeamUser {
  id: number;
  team_id: number;
  user_id: number;
  occupation_id: number;
  created_at: string;
  updated_at: string;
  user?: User;
  team?: Team;
  occupation?: Occupation;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface AddUserToTeamRequest {
  user_id: number;
  occupation_id: number;
}

const teamService = {
  // Listar todas as equipes (usando ocupações como equipes)
  getTeams: async () => {
    try {
      // Buscar ocupações como equipes
      const occupationsResponse = await api.get<any[]>('/occupation');
      console.log('Dados de ocupações recebidos:', occupationsResponse.data);

      // Mapeia ocupações para o formato de equipes
      const teamsFromOccupations = occupationsResponse.data.map(occ => {
        // Ajusta os nomes dos campos para corresponder aos dados recebidos
        return {
          id: occ.id,
          name: occ.name,
          description: "", // Removendo a descrição automática
          created_at: occ.createdAt || occ.created_at,
          updated_at: occ.updatedAt || occ.updated_at,
          users: occ.users || []
        };
      });

      return teamsFromOccupations;
    } catch (error) {
      console.error('Erro ao buscar ocupações:', error);
      return [];
    }
  },

  // Obter uma equipe específica
  getTeam: async (id: number) => {
    try {
      // Buscar ocupação como equipe
      const response = await api.get<any>(`/occupation/${id}`);

      // Converter para o formato de Team
      return {
        id: response.data.id,
        name: response.data.name,
        description: "", // Removendo a descrição automática
        created_at: response.data.createdAt || response.data.created_at,
        updated_at: response.data.updatedAt || response.data.updated_at,
        users: response.data.users || []
      };
    } catch (error) {
      console.error(`Erro ao buscar ocupação ${id}:`, error);
      throw error;
    }
  },

  // Criar uma nova equipe
  createTeam: async (teamData: CreateTeamRequest) => {
    try {
      // Criar uma ocupação como equipe
      console.log('Criando equipe via API de ocupações:', teamData);
      const response = await api.post<any>('/occupation', {
        name: teamData.name,
        description: teamData.description || ''
      });
      console.log('Equipe criada via API de ocupações:', response.data);

      // Converte o formato da resposta para o formato de Team
      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        created_at: response.data.createdAt || response.data.created_at,
        updated_at: response.data.updatedAt || response.data.updated_at,
        users: response.data.users || []
      };
    } catch (error) {
      console.error('Erro ao criar equipe via API de ocupações:', error);
      throw error;
    }
  },

  // Atualizar uma equipe existente
  updateTeam: async (id: number, teamData: UpdateTeamRequest) => {
    try {
      // Atualizar uma ocupação como equipe
      console.log('Atualizando equipe via API de ocupações:', {
        id,
        data: teamData
      });
      const response = await api.put<any>(`/occupation/${id}`, {
        name: teamData.name,
        description: teamData.description
      });
      console.log('Equipe atualizada via API de ocupações:', response.data);

      // Converte o formato da resposta para o formato de Team
      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        created_at: response.data.createdAt || response.data.created_at,
        updated_at: response.data.updatedAt || response.data.updated_at,
        users: response.data.users || []
      };
    } catch (error) {
      console.error('Erro ao atualizar equipe via API de ocupações:', error);
      throw error;
    }
  },

  // Excluir uma equipe
  deleteTeam: async (id: number) => {
    try {
      // Excluir uma ocupação como equipe
      console.log('Excluindo equipe via API de ocupações:', id);
      const response = await api.delete(`/occupation/${id}`);
      console.log('Equipe excluída via API de ocupações:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir equipe via API de ocupações:', error);
      throw error;
    }
  },

  // Listar usuários de uma equipe (usando usuários de ocupações)
  getTeamUsers: async (teamId: number) => {
    try {
      // Buscar ocupações
      const occupationsResponse = await api.get<any[]>('/occupation');

      // Encontra a ocupação correspondente ao ID da equipe
      const occupation = occupationsResponse.data.find(occ => occ.id === teamId);

      if (!occupation) {
        return [];
      }

      // Mapeia usuários da ocupação para o formato de TeamUser
      return (occupation.users || []).map((user: any) => ({
        id: user.id,
        team_id: teamId,
        user_id: user.id,
        occupation_id: teamId,  // Usa o ID da ocupação como ID da ocupação do usuário na equipe
        created_at: user.createdAt || user.created_at,
        updated_at: user.updatedAt || user.updated_at,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        occupation: {
          id: teamId,
          name: occupation.name,
          created_at: occupation.createdAt || occupation.created_at,
          updated_at: occupation.updatedAt || occupation.updated_at
        }
      }));
    } catch (error) {
      console.error(`Erro ao buscar usuários da ocupação ${teamId}:`, error);
      return [];
    }
  },

  // Adicionar usuário a uma equipe
  addUserToTeam: async (teamId: number, userData: AddUserToTeamRequest) => {
    try {
      // Usar a API de ocupações (que é o que realmente funciona no backend)
      console.log('Adicionando usuário via API de ocupações:', {
        occupation_id: teamId,
        userId: userData.user_id
      });
      const response = await api.put<any>(`/user/${userData.user_id}`, { occupation_id: teamId });
      console.log('Usuário adicionado via API de ocupações:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar usuário via API de ocupações:', error);
      throw error; // Propagar o erro para ser tratado pelo chamador
    }
  },

  // Remover usuário de uma equipe
  removeUserFromTeam: async (_teamId: number, userId: number) => {
    try {
      // Usar a API de ocupações (que é o que realmente funciona no backend)
      console.log('Removendo usuário via API de ocupações:', {
        userId,
        occupation_id: null
      });
      const response = await api.put<any>(`/user/${userId}`, { occupation_id: null });
      console.log('Usuário removido via API de ocupações:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao remover usuário via API de ocupações:', error);
      throw error; // Propagar o erro para ser tratado pelo chamador
    }
  }
};

export default teamService;
