import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { closeDatabase, initializeDatabase, loadAppState, saveAppState } from '../src/server/database.ts';

const originalLocalMode = process.env.APP_LOCAL_MODE;
const originalDataDirectory = process.env.APP_DATA_DIR;
const originalEncryptionKey = process.env.APP_ENCRYPTION_KEY;
const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'suji-database-test-'));

process.env.APP_LOCAL_MODE = 'true';
process.env.APP_DATA_DIR = dataDirectory;
process.env.APP_ENCRYPTION_KEY = 'a'.repeat(64);

after(async () => {
  closeDatabase();
  await rm(dataDirectory, { recursive: true, force: true });
  if (originalLocalMode === undefined) delete process.env.APP_LOCAL_MODE;
  else process.env.APP_LOCAL_MODE = originalLocalMode;
  if (originalDataDirectory === undefined) delete process.env.APP_DATA_DIR;
  else process.env.APP_DATA_DIR = originalDataDirectory;
  if (originalEncryptionKey === undefined) delete process.env.APP_ENCRYPTION_KEY;
  else process.env.APP_ENCRYPTION_KEY = originalEncryptionKey;
});

test('local database persists app state and encrypts the AI gateway key', async () => {
  await initializeDatabase();
  const state = {
    exams: [{ id: 'exam-1', title: 'Ujian Matematika' }],
    aiGatewayConfig: {
      baseUrl: 'https://gateway.example/v1',
      model: 'test-model',
      apiKey: 'secret-api-key',
    },
  };

  await saveAppState(state);
  closeDatabase();

  assert.deepEqual(await loadAppState(), state);
});
