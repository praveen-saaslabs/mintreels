import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { useAuthGateStore } from '@/stores/auth-gate-store';

function isAuthRequired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'AUTH_REQUIRED';
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isAuthRequired(error)) {
        // Guests can read anonymously; a gated read resumes by refetching.
        useAuthGateStore.getState().requireAuth(() => {
          void query.fetch();
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (isAuthRequired(error)) {
        // Stash the failed mutation so it can be replayed verbatim post-login.
        useAuthGateStore.getState().requireAuth(() => {
          void mutation.execute(mutation.state.variables);
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
