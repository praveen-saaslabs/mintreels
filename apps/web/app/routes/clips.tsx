import { ClipFilters } from '@/components/clips/clip-filters';
import { ClipsGrid } from '@/components/clips/clips-grid';
import { ClipsHeader } from '@/components/clips/clips-header';

export function ClipsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 pt-7 pb-10">
      <ClipsHeader />
      <ClipFilters />
      <ClipsGrid />
    </div>
  );
}
