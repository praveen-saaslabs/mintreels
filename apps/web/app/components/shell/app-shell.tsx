import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProjectListNav } from './project-list-nav';
import { SidebarNav } from './sidebar-nav';
import { UserFooter } from './user-footer';

export function AppShell() {
  return (
    <TooltipProvider>
      <SidebarProvider
        className="mr-ambient text-[var(--mr-fg)]"
        style={
          {
            '--sidebar-width': '14.75rem',
          } as CSSProperties
        }
      >
        <Sidebar collapsible="icon" className="border-[var(--glass-border-subtle)]">
          <SidebarHeader className="h-[52px] justify-center border-b border-[var(--glass-border-subtle)] px-3">
            <div className="flex items-center gap-2 px-1">
              <div className="size-2.5 shrink-0 rounded-[3px] bg-[var(--mr-acc)]" />
              <span className="font-semibold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
                MintReels
              </span>
              <SidebarTrigger className="ml-auto md:hidden" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarNav />
            <SidebarSeparator />
            <ProjectListNav />
          </SidebarContent>

          <SidebarFooter className="border-t border-[var(--glass-border-subtle)]">
            <UserFooter />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-svh overflow-hidden bg-transparent">
          <div className="flex items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-2 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">MintReels</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
