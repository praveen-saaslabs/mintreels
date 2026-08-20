import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { queryKeys } from '@/lib/query-keys';
import { useAuthGateStore } from '@/stores/auth-gate-store';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

type Mode = 'login' | 'signup';

const COPY: Record<Mode, { title: string; description: string }> = {
  login: {
    title: 'Sign in to continue',
    description:
      'Create clips and exports by signing in. Your work so far will be saved to your account.',
  },
  signup: {
    title: 'Create your account',
    description:
      'Sign up to export your clip. The work you\'ve done so far will be locked to your new account.',
  },
};

/**
 * Global auth dialog raised when an action returns AUTH_REQUIRED. Lets a guest
 * sign in OR sign up without leaving the page, so the gated action can be
 * replayed afterwards. On success it refetches now-claimed data and resumes
 * the pending action.
 */
export function LoginDialog() {
  const queryClient = useQueryClient();
  const isOpen = useAuthGateStore((state) => state.isOpen);
  const close = useAuthGateStore((state) => state.close);
  const resume = useAuthGateStore((state) => state.resume);

  const [mode, setMode] = useState<Mode>('login');

  // Always reopen on the sign-in step; drop any half-finished signup state.
  useEffect(() => {
    if (isOpen) {
      setMode('login');
    }
  }, [isOpen]);

  function handleSuccess() {
    // Guest work is claimed under the (new or existing) user server-side; refetch it.
    void queryClient.invalidateQueries({ queryKey: queryKeys.all });
    resume();
  }

  const copy = COPY[mode];

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {mode === 'login' ? (
          <>
            <LoginForm embedded onSuccess={handleSuccess} />
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign up
              </button>
            </p>
          </>
        ) : null}

        {mode === 'signup' ? (
          <>
            <SignupForm embedded onSuccess={handleSuccess} />
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}