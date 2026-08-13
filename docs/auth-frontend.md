# MintReels Authentication — Frontend Contract

This is the source of truth for frontend developers implementing login, signup, email verification, and session handling.

**Backend-only work is in progress.** This document describes the API the backend will ship. Do not implement password reset, OAuth, refresh tokens, or MFA.

The JWT is never available to JavaScript. The browser stores it in an HTTP-only cookie named `auth_token`. Frontend code must not read, decode, store, or send the token manually.

---

## Stack assumptions

- React + React Router (`apps/web`)
- Call the API only through `apps/web/app/lib/api.ts`
- Dev: Vite proxies `/api` → `http://127.0.0.1:3000`, so use relative URLs (`/api/...`)
- JSON field names are **camelCase** (same as the rest of MintReels)
- User IDs are **integers**, not UUIDs
- Swagger UI (request/response examples): `http://localhost:3000/docs`

---

## Cookie / fetch rules

Every authenticated request (and every auth mutation) must include cookies:

```ts
fetch('/api/auth/me', { credentials: 'include' })
```

Wire this once in `apps/web/app/lib/api.ts`. Do **not** set `Authorization: Bearer ...`.

Cookie (set by the API, not by the frontend):

| Property | Value |
| --- | --- |
| Name | `auth_token` |
| HttpOnly | yes |
| SameSite | Lax |
| Path | `/` |
| Secure | yes in production |

Do **not** store the JWT in `localStorage`, `sessionStorage`, React state, Redux, Zustand, or the URL.

---

## Routes to add

| Path | Access | Purpose |
| --- | --- | --- |
| `/signup` | public | Email + password + confirm password |
| `/login` | public | Email + password |
| `/verify-email` | public | 4-digit OTP |
| `/recordings`, `/recordings/:id`, `/knowledge`, `/clips` | protected | Existing app |

Do **not** add “Forgot password?”, “Reset password”, or social login.

On app load, call `GET /api/auth/me`:

- `200` → treat as authenticated, show the app
- `401` → redirect to `/login` (unless the current route is public)

After successful verify-email or login, navigate into the app (e.g. `/recordings`). Do not send the user to login again after verify.

---

## Endpoints

Base path: `/api/auth`

### POST `/api/auth/signup` — public

Request:

```json
{ "email": "user@example.com", "password": "password" }
```

Success `201`:

```json
{ "requiresEmailVerification": true }
```

Then navigate to `/verify-email` and keep the email in UI state (or query string). The API never returns the OTP.

Errors:

| HTTP | `error` |
| --- | --- |
| 400 | validation (`issues` array, same as other APIs) |
| 409 | `USER_ALREADY_EXISTS` |

---

### POST `/api/auth/verify-email` — public

Request:

```json
{ "email": "user@example.com", "code": "4821" }
```

`code` is exactly 4 digits as a string.

Success `200` — sets `auth_token` cookie; user is logged in:

```json
{ "id": 1, "email": "user@example.com", "emailVerified": true }
```

Errors:

| HTTP | `error` |
| --- | --- |
| 400 | `INVALID_VERIFICATION_CODE` |
| 400 | `VERIFICATION_CODE_EXPIRED` |

---

### POST `/api/auth/resend-verification` — public

Request:

```json
{ "email": "user@example.com" }
```

Success `200`:

```json
{ "requiresEmailVerification": true }
```

Invalidates the previous OTP. New code expires in 2 minutes (backend clock is authoritative).

A short cooldown may return `429` with `error: "RATE_LIMITED"`. Wait and retry.

---

### POST `/api/auth/login` — public

Request:

```json
{ "email": "user@example.com", "password": "password" }
```

Success `200` — sets `auth_token` cookie:

```json
{ "id": 1, "email": "user@example.com", "emailVerified": true }
```

Errors:

| HTTP | `error` |
| --- | --- |
| 401 | `INVALID_CREDENTIALS` (wrong email or password — generic) |
| 403 | `EMAIL_NOT_VERIFIED` |

On `EMAIL_NOT_VERIFIED`, send the user to `/verify-email` with that email. Optionally call resend.

---

### POST `/api/auth/logout` — protected

Empty body. Clears `auth_token`. Success `204`. Then redirect to `/login`.

---

### GET `/api/auth/me` — protected

Success `200`:

```json
{ "id": 1, "email": "user@example.com", "emailVerified": true }
```

`401` `{ "error": "UNAUTHORIZED" }` if the cookie is missing, invalid, or expired.

Never returned: `passwordHash`, OTP fields, JWT, SMTP/PyAI secrets.

---

## Verify-email UI

Copy:

- Title: Verify your email
- “We sent a verification code to: `{email}`”
- Four digit boxes (or one 4-digit input)
- Verify button
- Countdown: `Code expires in M:SS` starting at **2:00**
- Resend code (enabled when expired, or always with cooldown handling)

The countdown is UX only. The backend rejects expired codes even if the timer is wrong.

When the timer hits zero, show that the code expired and let the user resend.

On successful verify, cookies are set automatically; navigate to the app.

---

## Signup UI

Fields: email, password, confirm password. Confirm is frontend-only; the API only receives `email` and `password`.

---

## Login UI

Fields: email, password. No forgot-password link.

---

## Protected APIs

After login, all product GETs require the cookie and are scoped to the logged-in user. **Shapes and mock mapping:** [`docs/api-frontend.md`](./api-frontend.md).

If user A requests user B’s recording, the API returns **404** (not 403), so IDs are not leaked.

---

## Error shape

Same as the rest of the API:

```json
{ "error": "EMAIL_NOT_VERIFIED" }
```

Validation:

```json
{ "error": "Invalid request", "issues": [ ... ] }
```

Switch on `error`. Do not display stack traces.

---

## Out of scope (do not build)

Forgot/reset/change password, refresh tokens, OAuth/social login, MFA, phone verification, orgs/teams/RBAC, reading or storing the JWT in JS, putting PyAI or SMTP credentials in frontend env.
