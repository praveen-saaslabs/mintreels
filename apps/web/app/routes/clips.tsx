import { useState } from 'react';
import { ClipFilters } from '@/components/clips/clip-filters';
import { ClipsGrid } from '@/components/clips/clips-grid';
import { ClipsHeader } from '@/components/clips/clips-header';
import type { ClipFilterId } from '@/lib/data/types';

export function ClipsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterId, setActiveFilterId] = useState<ClipFilterId>('all');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 pt-7 pb-10">
      <ClipsHeader searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <ClipFilters
        activeFilterId={activeFilterId}
        onActiveFilterIdChange={setActiveFilterId}
      />
      <ClipsGrid searchQuery={searchQuery} activeFilterId={activeFilterId} />
    </div>
  );
}
