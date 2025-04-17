
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  collapsed: boolean;
  active?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  href,
  collapsed,
  active
}) => {
  return (
    <a 
      href={href} 
      className={cn(
        "sidebar-item", 
        active && "active"
      )}
    >
      <Icon className="h-5 w-5 text-sidebar-foreground" />
      {!collapsed && <span className="text-sidebar-foreground">{label}</span>}
    </a>
  );
};
