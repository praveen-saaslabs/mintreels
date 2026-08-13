export const AUTH_COOKIE_NAME = 'auth_token';

/** Cookie maxAge matches the default JWT lifetime (24h). */
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
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

export function loadSmtpConfig(): SmtpConfig {
  const portRaw = process.env.SMTP_PORT?.trim() || '2525';
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  }
  return {
    host: requireEnv('SMTP_HOST'),
    port,
    user: requireEnv('SMTP_USER'),
    password: requireEnv('SMTP_PASSWORD'),
    fromEmail: requireEnv('SMTP_FROM_EMAIL'),
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
