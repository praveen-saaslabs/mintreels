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

export const authUserResponseSchema = userPublicSchema;

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
