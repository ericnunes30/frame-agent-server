import api from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user_id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  occupation_id?: number;
  created_at: string;
  updated_at: string;
}

const authService = {
  // Login na aplicação
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<AuthResponse>('/session', credentials);

    // Salva o token e o ID do usuário no localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);

      // Salva o ID do usuário para uso futuro
      if (response.data.user_id) {
        localStorage.setItem('user_id', response.data.user_id.toString());
      }

      // Salva o nome do usuário para uso futuro
      if (response.data.name) {
        localStorage.setItem('user_name', response.data.name);
      }
    }

    console.log('Login response:', response.data);
    return response.data;
  },

  // Logout da aplicação
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    window.location.href = '/';
  },

  // Verifica se o usuário está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Obtém o usuário atual
  getCurrentUser: async () => {
    try {
      // Tenta obter o usuário da API
      const response = await api.get<User>('/me');
      if (response.data && response.data.id) {
        return response.data;
      }

      // Se a API não retornar os dados do usuário, tenta criar um objeto de usuário com os dados do localStorage
      const userId = localStorage.getItem('user_id');
      const userName = localStorage.getItem('user_name');

      if (userId && userName) {
        // Cria um objeto de usuário básico com os dados disponíveis
        return {
          id: parseInt(userId),
          name: userName,
          email: '',  // Não temos o email no localStorage
          created_at: new Date().toISOString()
        } as User;
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);

      // Tenta criar um objeto de usuário com os dados do localStorage
      const userId = localStorage.getItem('user_id');
      const userName = localStorage.getItem('user_name');

      if (userId && userName) {
        // Cria um objeto de usuário básico com os dados disponíveis
        return {
          id: parseInt(userId),
          name: userName,
          email: '',  // Não temos o email no localStorage
          created_at: new Date().toISOString()
        } as User;
      }

      return null;
    }
  }
};

export default authService;
