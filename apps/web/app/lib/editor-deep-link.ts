import { parsePositiveIntId } from '@/lib/recording-id';

export type EditorTabId = 'ask' | 'hooks' | 'summary';

export type EditorDeepLink = {
  tab: EditorTabId;
  startMs: number | undefined;
  hookId: number | undefined;
  recordingId: number | undefined;
};

function parseNonNegativeInt(raw: string | null): number | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

export function parseEditorDeepLink(search: string | URLSearchParams): EditorDeepLink {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const tabRaw = params.get('tab');
  const tab: EditorTabId =
    tabRaw === 'hooks' || tabRaw === 'summary' || tabRaw === 'ask' ? tabRaw : 'ask';

  return {
    tab,
    startMs: parseNonNegativeInt(params.get('t')),
    hookId: parsePositiveIntId(params.get('hook')),
    recordingId: parsePositiveIntId(params.get('recording')),
  };
}

export function editorDeepLinkSearch(input: {
  tab?: EditorTabId;
  startMs?: number;
  hookId?: number | null;
  recordingId?: number;
}): string {
  const params = new URLSearchParams();
  if (input.tab) {
    params.set('tab', input.tab);
  }
  if (input.startMs != null && Number.isInteger(input.startMs) && input.startMs >= 0) {
    params.set('t', String(input.startMs));
  }
  if (input.hookId != null && Number.isInteger(input.hookId) && input.hookId > 0) {
    params.set('hook', String(input.hookId));
  }
  if (input.recordingId != null && Number.isInteger(input.recordingId) && input.recordingId > 0) {
    params.set('recording', String(input.recordingId));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
