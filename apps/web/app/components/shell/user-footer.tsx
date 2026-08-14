import { Button } from '@/components/ui/button';
import { useWorkspaceUserQuery } from '@/hooks/use-home-queries';
import { useAuth } from '@/providers/auth-provider';
import { LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './theme-toggle';

function initialsFromEmail(email: string) {
  const local = email.split('@')[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

export function UserFooter({
  showThemeToggle = true,
}: Readonly<{
  showThemeToggle?: boolean;
}>) {
  const { data: workspaceUser } = useWorkspaceUserQuery();
  const { user: authUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const settingsActive = location.pathname.startsWith('/settings');

  const displayName = workspaceUser?.displayName ?? authUser?.email ?? 'Loading…';
  const initials = workspaceUser?.initials ?? (authUser ? initialsFromEmail(authUser.email) : '—');

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
        <div className="glass-chip flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
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

      {showThemeToggle ? <ThemeToggle /> : null}

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
