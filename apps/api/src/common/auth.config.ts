export const AUTH_COOKIE_NAME = 'auth_token';

/** Cookie maxAge matches the default JWT lifetime (24h). */
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}


function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}


export function loadWebOrigin(): string {
  const value = process.env.WEB_ORIGIN;
  if (!value || value.trim() === '') {
    return 'http://127.0.0.1:5173';
  }
  return value.trim();
}

export function loadJwtConfig(): JwtConfig {
  return {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '24h',
  };
}


export function authCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}
