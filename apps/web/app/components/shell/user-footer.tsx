import { useProjects } from '@/providers/projects-provider';
import { useTheme } from '@/providers/theme-provider';

export function UserFooter() {
  const { user } = useProjects();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mt-auto flex flex-none items-center gap-2.5 border-t border-[var(--mr-bd2)] px-3.5 py-3">
      <div className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-[var(--mr-muted)] text-[11px] font-semibold">
        {user?.initials ?? '—'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">
          {user?.displayName ?? 'Loading…'}
        </div>
        <div className="text-[10.5px] text-[var(--mr-mfg)]">
          {user?.subtitle ?? ''}
        </div>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="h-6 rounded-[7px] border border-[var(--mr-bd)] bg-transparent px-2 text-[11px] font-medium text-[var(--mr-mfg)] hover:text-[var(--mr-fg)]"
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </div>
  );
}
