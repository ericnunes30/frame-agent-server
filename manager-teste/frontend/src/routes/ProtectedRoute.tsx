import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const permissions = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  // Efeito para verificar o token no localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Se não houver token, redirecionar para login
    if (!token && !isLoading) {
      console.warn('ProtectedRoute - Token não encontrado, redirecionando para login');
      toast.error('Você precisa fazer login para acessar esta página');
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isLoading, isAuthenticated, location, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.warn('ProtectedRoute - Não autenticado, redirecionando para login');
    // Redireciona para a página de login, mantendo a URL original como state
    // para redirecionar de volta após o login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o usuário é um membro e está tentando acessar páginas restritas
  if (permissions.isMember) {
    // Verificar se o caminho atual é /users ou /teams
    if (location.pathname === '/users' || location.pathname === '/teams') {
      console.warn('ProtectedRoute - Usuário com nível de Membro tentando acessar página restrita:', location.pathname);
      toast.error('Você não tem permissão para acessar esta página');
      // Redirecionar para a página de projetos
      return <Navigate to="/projects" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
