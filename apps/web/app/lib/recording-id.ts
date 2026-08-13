import { useParams } from 'react-router-dom';

export function parseRecordingId(raw: string | undefined | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return undefined;
  }

  return id;
}

export function useRecordingId(): number | undefined {
  const { id } = useParams();
  return parseRecordingId(id);
}
