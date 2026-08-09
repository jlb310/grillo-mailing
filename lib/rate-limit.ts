// In-memory throttling for the credentials sign-in. Good enough for the
// single-instance Docker deployment: on restart the counters reset, which only
// shortens an existing lockout. If the app ever runs multiple instances, this
// needs a shared store (Redis/DB) keyed the same way.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // 5 failed attempts allowed per 15 min...
const LOCKOUT_MS = 15 * 60 * 1000; // ...then the key is locked for 15 min.

interface Entry {
  count: number;
  resetAt: number;
  lockedUntil: number;
}

const failures = new Map<string, Entry>();

function now(): number {
  return Date.now();
}

/** True unless the key is currently locked out. */
export function isLoginThrottled(key: string): { throttled: boolean; retryAfterMs?: number } {
  const e = failures.get(key);
  if (e && e.lockedUntil > now()) {
    return { throttled: true, retryAfterMs: e.lockedUntil - now() };
  }
  return { throttled: false };
}

/** Record a failed attempt; locks the key once it hits MAX_FAILURES. */
export function recordLoginFailure(key: string): void {
  const t = now();
  const e = failures.get(key);
  if (!e || e.resetAt < t) {
    failures.set(key, { count: 1, resetAt: t + WINDOW_MS, lockedUntil: 0 });
    return;
  }
  e.count += 1;
  if (e.count >= MAX_FAILURES) e.lockedUntil = t + LOCKOUT_MS;
}

/** Clear the counters after a successful sign-in. */
export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
