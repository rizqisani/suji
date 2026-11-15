import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function getCredentials() {
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!username || !password || !secret || secret.length < 32) {
    throw new Error(
      'APP_USERNAME, APP_PASSWORD, dan SESSION_SECRET (minimal 32 karakter) wajib dikonfigurasi.'
    );
  }
  return { username, password, secret };
}

export function validateAuthConfiguration(): void {
  getCredentials();
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyLogin(username: string, password: string): boolean {
  const expected = getCredentials();
  return (
    constantTimeEqual(username, expected.username) &&
    constantTimeEqual(password, expected.password)
  );
}

export function createSessionToken(username: string): string {
  const { secret } = getCredentials();
  const payload = Buffer.from(
    JSON.stringify({ username, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const { username, secret } = getCredentials();
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url');
    if (!constantTimeEqual(signature, expectedSignature)) return false;

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.username === username && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export { SESSION_TTL_SECONDS };
