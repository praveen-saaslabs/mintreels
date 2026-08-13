import { useParams } from 'react-router-dom';

export function RecordingDetailPage() {
  const { id } = useParams();

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-7 pb-10">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Recording</h1>
      <p className="mt-2 text-sm text-[var(--mr-mfg)]">
        Recording detail is not implemented yet{id ? ` (${id})` : ''}.
      </p>
    </section>
  );
}
