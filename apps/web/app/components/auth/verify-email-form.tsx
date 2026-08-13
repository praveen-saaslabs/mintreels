import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmailRequestSchema } from '@mintreels/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authErrorMessage } from '@/lib/auth-errors';
import { useAuth } from '@/providers/auth-provider';
import { AuthLayout } from './auth-layout';

const CODE_LENGTH = 4;
const EXPIRE_SECONDS = 120;

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

export function VerifyEmailForm() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email')?.trim() ?? '';

  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: CODE_LENGTH }, () => ''));
  const [secondsLeft, setSecondsLeft] = useState(EXPIRE_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => digits.join(''), [digits]);
  const expired = secondsLeft <= 0;

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  function focusIndex(index: number) {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < CODE_LENGTH - 1) {
      focusIndex(index + 1);
    }
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) {
      return;
    }
    const next = Array.from({ length: CODE_LENGTH }, (_, index) => pasted[index] ?? '');
    setDigits(next);
    focusIndex(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError('Missing email. Start again from sign up or sign in.');
      return;
    }

    const parsed = verifyEmailRequestSchema.safeParse({ email, code });
    if (!parsed.success) {
      setError('Enter the 4-digit code from your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmail(parsed.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Missing email. Start again from sign up or sign in.');
      return;
    }

    setIsResending(true);
    try {
      await resendVerification(email);
      setDigits(Array.from({ length: CODE_LENGTH }, () => ''));
      setSecondsLeft(EXPIRE_SECONDS);
      setInfo('A new code was sent.');
      focusIndex(0);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      description={
        email
          ? `We sent a verification code to: ${email}`
          : 'We sent a verification code to your email.'
      }
      footer={
        <>
          Wrong email?{' '}
          <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up again
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="otp-0">Verification code</Label>
          <div className="flex justify-between gap-2">
            {digits.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${String(index)}`}
                ref={(node) => {
                  inputsRef.current[index] = node;
                }}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => onKeyDown(index, event)}
                onPaste={onPaste}
                className="h-11 w-11 text-center font-mono text-lg"
                aria-label={`Digit ${String(index + 1)}`}
              />
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {expired
            ? 'Code expired. Request a new one.'
            : `Code expires in ${formatCountdown(secondsLeft)}`}
        </p>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="text-sm text-[var(--mr-acc)]" role="status">
            {info}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== CODE_LENGTH}>
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void onResend()}
          disabled={isResending}
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </Button>
      </form>
    </AuthLayout>
  );
}
