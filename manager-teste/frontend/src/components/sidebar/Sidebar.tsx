
import React from 'react';
import { Briefcase, ListChecks, Users, ChevronLeft, ChevronRight, User, Settings } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { SidebarItem } from './SidebarItem';
import { useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const permissions = usePermissions();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside
      className={cn(
        "bg-sidebar h-screen flex flex-col border-r border-sidebar-border transition-all duration-300 z-30",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between h-[61px] px-4 border-b border-sidebar-border">
        <h1 className={cn("text-sidebar-foreground font-bold", collapsed ? "hidden" : "block")}>
          Manager Group
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7 p-0"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {/* Dashboard item removido conforme solicitado */}
          <SidebarItem
            icon={Briefcase}
            label="Projetos"
            href="/projects"
            collapsed={collapsed}
            active={isActive('/projects')}
          />
          <SidebarItem
            icon={ListChecks}
            label="Tarefas"
            href="/tasks"
            collapsed={collapsed}
            active={isActive('/tasks')}
          />
          {/* Ocultar itens de Equipes e Usuários para usuários com nível de Membro */}
          {!permissions.isMember && (
            <>
              <SidebarItem
                icon={Users}
                label="Equipes"
                href="/teams"
                collapsed={collapsed}
                active={isActive('/teams')}
              />
              <SidebarItem
                icon={User}
                label="Usuários"
                href="/users"
                collapsed={collapsed}
                active={isActive('/users')}
              />
            </>
          )}
        </div>
      </nav>
      <div className="p-2 border-t border-sidebar-border mt-auto">
        <SidebarItem
          icon={Settings}
          label="Configurações"
          href="/settings"
          collapsed={collapsed}
          active={isActive('/settings')}
        />
      </div>
    </aside>
  );
};
