import { NavLink, useLocation } from 'react-router-dom';
import { Clapperboard, LayoutGrid } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useClips } from '@/providers/clips-provider';
import { useProjects } from '@/providers/projects-provider';

export function SidebarNav() {
  const location = useLocation();
  const { stats } = useProjects();
  const { clips } = useClips();

  const projectCount = stats?.projectCount ?? 0;
  const clipCount = stats?.clipCount ?? clips.length;

  const items = [
    {
      to: '/',
      end: true,
      label: 'Home',
      icon: LayoutGrid,
      badge: projectCount,
      isActive: location.pathname === '/',
    },
    {
      to: '/clips',
      end: false,
      label: 'Clips',
      icon: Clapperboard,
      badge: clipCount,
      isActive: location.pathname.startsWith('/clips'),
    },
  ] as const;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                isActive={item.isActive}
                tooltip={item.label}
                render={<NavLink to={item.to} end={item.end} />}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge className="font-mono text-[11px] text-muted-foreground">
                {item.badge}
              </SidebarMenuBadge>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
