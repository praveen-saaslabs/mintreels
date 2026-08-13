import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupRequestSchema } from '@mintreels/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authErrorMessage } from '@/lib/auth-errors';
import { useAuth } from '@/providers/auth-provider';
import { AuthLayout } from './auth-layout';

export function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const parsed = signupRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError('Enter a valid email and a password with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(parsed.data);
      navigate(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`, {
        replace: true,
      });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      description="Sign up with email and password. We’ll send a verification code."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
