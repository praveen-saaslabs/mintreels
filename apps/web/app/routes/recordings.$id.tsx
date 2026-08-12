import { useParams } from 'react-router-dom';

export function RecordingDetailPage() {
  const { id } = useParams();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Recording</h1>
      {/* TODO: video player, timestamped transcript, summary, hooks, add to global KB */}
      <p className="mt-2 text-sm text-neutral-600">
        Recording detail is not implemented yet{id ? ` (${id})` : ''}.
      </p>
    </section>
  );
}
