import { z } from 'zod';
import { userPublicSchema } from './users';

export const signupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const verifyEmailRequestSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{4}$/),
});

export const resendVerificationRequestSchema = z.object({
  email: z.string().email(),
});

export const authUserResponseSchema = userPublicSchema;

export const signupResponseSchema = z.object({
  requiresEmailVerification: z.literal(true),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
export type SignupResponse = z.infer<typeof signupResponseSchema>;
