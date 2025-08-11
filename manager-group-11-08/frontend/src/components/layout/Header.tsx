
import React from 'react';
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Obter as iniciais do nome do usuário
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'UN';

  const userName = user?.name || 'Usuário';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-border py-3 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Ícone de notificações removido conforme solicitado */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 pl-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{userInitials}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm hidden md:inline-block">{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Opções de perfil e configurações removidas conforme solicitado */}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
