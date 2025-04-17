import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, AuthResponse, User } from '@/lib/api';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica se o usuário está autenticado ao carregar o componente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Função de login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Tenta fazer login
      const response = await authService.login({ email, password });

      // Verifica se o token foi recebido corretamente
      if (!response || !response.token) {
        throw new Error('Token de autenticação não recebido');
      }

      console.log('Login bem-sucedido, token recebido:', response.token.substring(0, 10) + '...');

      // Obtém os dados do usuário após o login
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);

        // Redireciona para a página anterior ou para a home
        const origin = location.state?.from?.pathname || '/';
        navigate(origin);

        toast.success('Login realizado com sucesso!');
      } else {
        // Se não conseguiu obter os dados do usuário, mas o token foi recebido
        console.warn('Token recebido, mas não foi possível obter dados do usuário');
        setIsAuthenticated(true); // Ainda considera autenticado pois tem o token
        navigate('/');
        toast.success('Login realizado com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast.error(
        error.response?.data?.message ||
        'Erro ao fazer login. Verifique suas credenciais.'
      );
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
    toast.success('Logout realizado com sucesso!');
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
