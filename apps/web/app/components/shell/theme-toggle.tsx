import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playThemeSwitchSound } from '@/lib/theme-switch-sound';
import { useTheme } from '@/providers/theme-provider';

export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const { theme, toggleTheme } = useTheme();

  function handleThemeToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    playThemeSwitchSound(nextTheme);
    toggleTheme();
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleThemeToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className={className ?? 'shrink-0 text-muted-foreground'}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
