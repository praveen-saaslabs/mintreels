import { ProjectsGrid } from '@/components/home/projects-grid';
import { ProjectsHeader } from '@/components/home/projects-header';

export function IndexPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto px-8 pt-7 pb-10">
      <ProjectsHeader />
      <ProjectsGrid />
    </div>
  );
}
