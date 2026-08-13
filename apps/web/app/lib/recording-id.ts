import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';

export function parsePositiveIntId(raw: string | undefined | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return undefined;
  }

  return id;
}

/** Route param on `/editor/:id` is the project id (not the recording id). */
export function useProjectId(): number | undefined {
  const { id } = useParams();
  return parsePositiveIntId(id);
}

const RecordingIdContext = createContext<number | undefined>(undefined);

export const RecordingIdProvider = RecordingIdContext.Provider;

/** Recording id resolved for the current editor project (from API / create flow). */
export function useRecordingId(): number | undefined {
  return useContext(RecordingIdContext);
}
