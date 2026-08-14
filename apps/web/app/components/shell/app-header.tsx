import { SidebarTrigger } from '@/components/ui/sidebar';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3">
      <SidebarTrigger className="md:hidden" />
      <BrandLogo
        className="md:hidden"
        markClassName="size-6"
        wordmarkClassName="text-sm font-medium"
      />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
