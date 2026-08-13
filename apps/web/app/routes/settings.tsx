import { ProvidersSection } from '@/components/settings/providers-section';
import { RenderDefaults } from '@/components/settings/render-defaults';
import { StorageJobs } from '@/components/settings/storage-jobs';

export function SettingsPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-7 pb-12">
      <div className="flex max-w-[720px] flex-col gap-[26px]">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Settings</h1>
          <p className="mt-1.5 mb-0 text-[13px] text-[var(--mr-mfg)]">
            Providers, keys and render defaults for this workspace.
          </p>
        </div>
        <ProvidersSection />
        <RenderDefaults />
        <StorageJobs />
      </div>
    </div>
  );
}
