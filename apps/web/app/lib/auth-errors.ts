import { ApiError } from '@/lib/api';

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Invalid email or password.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email before signing in.';
    case 'USER_ALREADY_EXISTS':
      return 'An account with this email already exists.';
    case 'INVALID_VERIFICATION_CODE':
      return 'That code is incorrect.';
    case 'VERIFICATION_CODE_EXPIRED':
      return 'That code has expired. Request a new one.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Wait a moment and try again.';
    case 'UNAUTHORIZED':
      return 'Your session has expired. Please sign in again.';
    case 'Invalid request':
      return 'Check the form and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
