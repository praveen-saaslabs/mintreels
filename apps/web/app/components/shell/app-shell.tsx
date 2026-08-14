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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppHeader } from './app-header';
import { BrandLogo } from '@/components/brand/brand-logo';
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
              <BrandLogo
                className="min-w-0 flex-1"
                markClassName="size-7 group-data-[collapsible=icon]:size-6"
                wordmarkClassName="group-data-[collapsible=icon]:hidden"
              />
              <SidebarTrigger className="ml-auto md:hidden" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarNav />
            <ProjectListNav />
          </SidebarContent>

          <SidebarFooter className="border-t border-[var(--glass-border-subtle)]">
            <UserFooter showThemeToggle={false} />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-svh overflow-hidden bg-transparent">
          <AppHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
