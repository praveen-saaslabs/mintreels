import { create } from 'zustand';

type AuthGateState = {
  /** Whether the login dialog raised by an AUTH_REQUIRED response is open. */
  isOpen: boolean;
  /** Replays the action that triggered the gate (e.g. the export mutation). */
  retry: (() => void) | null;
  /** Open the login dialog and stash the action to replay after login. */
  requireAuth: (retry?: (() => void) | null) => void;
  /** Close without replaying (user dismissed the dialog). */
  close: () => void;
  /** Close and replay the stashed action after a successful login. */
  resume: () => void;
};

export const useAuthGateStore = create<AuthGateState>((set, get) => ({
  isOpen: false,
  retry: null,
  requireAuth: (retry = null) => {
    // Keep the first pending action if the gate is already open.
    if (get().isOpen) {
      return;
    }
    set({ isOpen: true, retry: retry ?? null });
  },
  close: () => set({ isOpen: false, retry: null }),
  resume: () => {
    const { retry } = get();
    set({ isOpen: false, retry: null });
    retry?.();
  },
}));
