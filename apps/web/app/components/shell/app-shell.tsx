import { Outlet } from 'react-router-dom';
import { ProjectListNav } from './project-list-nav';
import { SidebarNav } from './sidebar-nav';
import { UserFooter } from './user-footer';

export function AppShell() {
  return (
    <div className="flex h-svh overflow-hidden bg-[var(--mr-bg)] text-[var(--mr-fg)]">
      <aside className="flex w-[236px] shrink-0 flex-col border-r border-[var(--mr-bd)] bg-[var(--mr-panel)]">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[var(--mr-bd2)] px-3.5">
          <div className="size-2.5 rounded-[3px] bg-[var(--mr-acc)]" />
          <span className="font-semibold tracking-[-0.01em]">MintReels</span>
        </div>

        <SidebarNav />
        <ProjectListNav />
        <UserFooter />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
