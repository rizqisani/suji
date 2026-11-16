import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('local server serves app state without login and binds to loopback', async (t) => {
  const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'suji-server-test-'));
  const previousEnvironment = {
    APP_LOCAL_MODE: process.env.APP_LOCAL_MODE,
    APP_DATA_DIR: process.env.APP_DATA_DIR,
    APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY,
    APP_WEB_DIST: process.env.APP_WEB_DIST,
    NODE_ENV: process.env.NODE_ENV,
  };
  Object.assign(process.env, {
    APP_LOCAL_MODE: 'true',
    APP_DATA_DIR: dataDirectory,
    APP_ENCRYPTION_KEY: 'b'.repeat(64),
    APP_WEB_DIST: dataDirectory,
    NODE_ENV: 'production',
  });

  let server: Server | undefined;
  let closeDatabase: (() => void) | undefined;
  t.after(async () => {
    const serverToClose = server;
    if (serverToClose) {
      await new Promise<void>((resolve, reject) => {
        serverToClose.close((error) => (error ? reject(error) : resolve()));
      });
    }
    closeDatabase?.();
    await fs.rm(dataDirectory, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const serverModule = await import('../server.ts');
  ({ closeDatabase } = await import('../src/server/database.ts'));
  const runningServer = await serverModule.setupServer({ host: '127.0.0.1', port: 0 });
  server = runningServer;

  const address = runningServer.address();
  assert.ok(address && typeof address !== 'string');
  assert.equal(address.address, '127.0.0.1');
  const origin = `http://127.0.0.1:${address.port}`;

  const sessionResponse = await fetch(`${origin}/api/auth/session`);
  assert.deepEqual(await sessionResponse.json(), { authenticated: true });

  const initialStateResponse = await fetch(`${origin}/api/app-state`);
  assert.equal(initialStateResponse.status, 200);
  assert.deepEqual(await initialStateResponse.json(), { success: true, state: null });

  const state = { exams: [{ id: 'local-exam' }] };
  const saveResponse = await fetch(`${origin}/api/app-state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  assert.equal(saveResponse.status, 200);
  const savedStateResponse = await fetch(`${origin}/api/app-state`);
  assert.deepEqual(await savedStateResponse.json(), { success: true, state });
});
