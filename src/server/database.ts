import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Pool } from 'pg';

let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL wajib dikonfigurasi untuk koneksi PostgreSQL.');
  }
  pool = new Pool({ connectionString });
  return pool;
}

function getEncryptionKey(): Buffer {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) {
    throw new Error('APP_ENCRYPTION_KEY wajib berisi 64 karakter hexadecimal (32 byte).');
  }
  return Buffer.from(key, 'hex');
}

export interface EncryptedSecret {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    ciphertext: ciphertext.toString('hex'),
  };
}

export function decryptSecret(encrypted: EncryptedSecret): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encrypted.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function protectState(state: Record<string, any>): Record<string, any> {
  const protectedState = structuredClone(state);
  const gateway = protectedState.aiGatewayConfig;
  if (gateway?.apiKey) {
    protectedState.aiGatewayConfig = {
      baseUrl: gateway.baseUrl,
      model: gateway.model,
      encryptedApiKey: encryptSecret(gateway.apiKey),
    };
  }
  return protectedState;
}

function revealState(state: Record<string, any>): Record<string, any> {
  const revealedState = structuredClone(state);
  const encrypted = revealedState.aiGatewayConfig?.encryptedApiKey;
  if (encrypted) {
    revealedState.aiGatewayConfig = {
      baseUrl: revealedState.aiGatewayConfig.baseUrl,
      model: revealedState.aiGatewayConfig.model,
      apiKey: decryptSecret(encrypted),
    };
  }
  return revealedState;
}

export async function initializeDatabase(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function loadAppState(): Promise<Record<string, any> | null> {
  const result = await getPool().query<{ state: Record<string, any> }>(
    'SELECT state FROM app_state WHERE id = 1'
  );
  return result.rows[0] ? revealState(result.rows[0].state) : null;
}

export async function saveAppState(state: Record<string, any>): Promise<void> {
  const protectedState = protectState(state);
  await getPool().query(
    `INSERT INTO app_state (id, state, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [JSON.stringify(protectedState)]
  );
}
