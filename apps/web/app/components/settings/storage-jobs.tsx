import { useSettingsQuery } from '@/hooks/use-home-queries';

export function StorageJobs() {
  const { data: settings, isLoading } = useSettingsQuery();
  const stats = settings?.storageJobs;

  return (
    <section className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
        Storage & jobs
      </div>
      <div className="glass grid grid-cols-3 gap-4 rounded-2xl p-3.5">
        {isLoading || !stats ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-[var(--mr-muted)]" />
          ))
        ) : (
          <>
            <div>
              <div className="font-mono text-[17px] font-medium">{stats.mediaOnDiskGb} GB</div>
              <div className="mt-0.5 text-[11px] text-[var(--mr-mfg)]">media on disk</div>
            </div>
            <div>
              <div className="font-mono text-[17px] font-medium">
                {stats.workerConcurrency}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--mr-mfg)]">worker concurrency</div>
            </div>
            <div>
              <div className="font-mono text-[17px] font-medium text-[var(--mr-bad)]">
                {stats.failedJobsRetryable}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--mr-mfg)]">
                failed jobs (retryable)
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
