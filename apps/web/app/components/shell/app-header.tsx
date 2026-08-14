import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3">
      <SidebarTrigger className="md:hidden" />
      <span className="text-sm font-medium md:hidden">MintReels</span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
