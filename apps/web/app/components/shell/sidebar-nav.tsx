import { NavLink } from 'react-router-dom';
import { Clapperboard, LayoutGrid, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClips } from '@/providers/clips-provider';
import { useProjects } from '@/providers/projects-provider';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-[34px] items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[13px] font-medium transition-colors',
    isActive
      ? 'bg-[var(--mr-muted)] text-[var(--mr-fg)]'
      : 'bg-transparent text-[var(--mr-mfg)] hover:bg-[var(--mr-muted)]/60 hover:text-[var(--mr-fg)]',
  );

export function SidebarNav() {
  const { stats } = useProjects();
  const { clips } = useClips();

  const projectCount = stats?.projectCount ?? 0;
  const clipCount = stats?.clipCount ?? clips.length;

  return (
    <nav className="flex flex-none flex-col gap-0.5 px-2 py-2.5">
      <NavLink to="/" end className={linkClass}>
        <LayoutGrid className="size-4 shrink-0" />
        <span className="flex-1">Home</span>
        <span className="font-mono text-[11px] text-[var(--mr-mfg)]">{projectCount}</span>
      </NavLink>
      <NavLink to="/clips" className={linkClass}>
        <Clapperboard className="size-4 shrink-0" />
        <span className="flex-1">Clips</span>
        <span className="font-mono text-[11px] text-[var(--mr-mfg)]">{clipCount}</span>
      </NavLink>
      <NavLink to="/settings" className={linkClass}>
        <Settings className="size-4 shrink-0" />
        <span className="flex-1">Settings</span>
      </NavLink>
    </nav>
  );
}
