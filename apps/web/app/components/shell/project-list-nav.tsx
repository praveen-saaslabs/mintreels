import { Link } from 'react-router-dom';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { SidebarProject } from '@/lib/data/types';
import { useSidebarProjectsQuery } from '@/hooks/use-home-queries';

function accentClass(accent: SidebarProject['accent']) {
  switch (accent) {
    case 'mint':
      return 'bg-[var(--mr-acc)]';
    case 'warn':
      return 'bg-[var(--mr-warn)]';
    default:
      return 'bg-muted-foreground';
  }
}

export function ProjectListNav() {
  const { data: sidebarProjects = [], isLoading } = useSidebarProjectsQuery();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))
            : sidebarProjects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    size="sm"
                    tooltip={project.name}
                    render={<Link to={`/editor/${String(project.id)}`} />}
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-[2px]',
                        accentClass(project.accent),
                      )}
                    />
                    <span>{project.name}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="font-mono text-[10.5px] text-muted-foreground">
                    {project.recordingCount}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
