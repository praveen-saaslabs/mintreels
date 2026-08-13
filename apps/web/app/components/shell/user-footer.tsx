import { Link, useLocation } from 'react-router-dom';
import { Moon, Settings, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playThemeSwitchSound } from '@/lib/theme-switch-sound';
import { useProjects } from '@/providers/projects-provider';
import { useTheme } from '@/providers/theme-provider';

export function UserFooter() {
  const { user } = useProjects();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const settingsActive = location.pathname.startsWith('/settings');

  function handleThemeToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    playThemeSwitchSound(nextTheme);
    toggleTheme();
  }

  return (
    <div className="flex w-full items-center gap-1 px-1 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold">
          {user?.initials ?? '—'}
        </div>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <div className="truncate text-xs font-medium">
            {user?.displayName ?? 'Loading…'}
          </div>
          <div className="truncate text-[10.5px] text-muted-foreground">
            {user?.subtitle ?? ''}
          </div>
        </div>
      </div>

      <Button
        variant={settingsActive ? 'secondary' : 'ghost'}
        size="icon-sm"
        nativeButton={false}
        render={<Link to="/settings" />}
        aria-label="Settings"
        title="Settings"
        className="shrink-0"
      >
        <Settings />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleThemeToggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className="shrink-0 text-muted-foreground"
      >
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </div>
  );
}
