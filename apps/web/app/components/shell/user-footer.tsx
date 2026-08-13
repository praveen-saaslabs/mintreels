import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceUserQuery } from '@/hooks/use-home-queries';
import { playThemeSwitchSound } from '@/lib/theme-switch-sound';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

function initialsFromEmail(email: string) {
  const local = email.split('@')[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

export function UserFooter() {
  const { data: workspaceUser } = useWorkspaceUserQuery();
  const { user: authUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const settingsActive = location.pathname.startsWith('/settings');

  const displayName =
    workspaceUser?.displayName ?? authUser?.email ?? 'Loading…';
  const initials = workspaceUser?.initials
    ?? (authUser ? initialsFromEmail(authUser.email) : '—');

  function handleThemeToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    playThemeSwitchSound(nextTheme);
    toggleTheme();
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex w-full items-center gap-1 px-1 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <div className="truncate text-xs font-medium">{displayName}</div>
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

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        aria-label="Sign out"
        title="Sign out"
        className="shrink-0 text-muted-foreground"
      >
        <LogOut />
      </Button>
    </div>
  );
}
