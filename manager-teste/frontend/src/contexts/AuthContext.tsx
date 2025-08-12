import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/common/types';
import { useBackendServices } from '../hooks/useBackendServices';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  const services = useBackendServices();
  const loginMutation = services.auth.useLogin();
  const logoutMutation = services.auth.useLogout();
  const { isAuthenticated: authStatus } = services.auth.useAuthStatus();
  const { data: currentUser, isLoading: userLoading, refetch: refetchUser } = services.auth.useGetCurrentUser(authStatus);

  const isLoading = loginMutation.isPending || userLoading;

  // Sincroniza o estado local com os dados do usuário
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    } else if (authStatus) {
      setIsAuthenticated(true);
      setUser(null);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [currentUser, authStatus]);

  // Função de login
  const login = async (email: string, password: string) => {
    try {
      const response = await loginMutation.mutateAsync({ email, password });

      // Verifica se o token foi recebido corretamente
      if (!response || !response.token) {
        throw new Error('Token de autenticação não recebido');
      }

      // Recarrega os dados do usuário após o login
      const userResult = await refetchUser();
      
      if (userResult.data) {
        setUser(userResult.data);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(true);
        setUser(null);
      }

      // Redireciona para a página anterior ou para a home
      const origin = location.state?.from?.pathname || '/';
      navigate(origin);

      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast.error(
        error.response?.data?.message ||
        'Erro ao fazer login. Verifique suas credenciais.'
      );
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Função de logout
  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
        toast.success('Logout realizado com sucesso!');
      }
    });
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
