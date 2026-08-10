import { createHmac } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/create-access-invite.mjs');

const CODE_SECRET = 'test-create-invite-code-secret-that-is-long-enough';

const ADMIN_KEY = 'test-service-role-key';

type SpawnResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

type CapturedRequest = {
  body: Record<string, unknown> | Record<string, unknown>[];
  method: string | undefined;
  url: string | undefined;
};

let activeServer: Server | undefined;

const temporaryDirectories: string[] = [];

const createTestEnvFile = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'create-access-invite-test-'));

  temporaryDirectories.push(directory);

  const envFilePath = join(directory, '.env.test');

  await writeFile(
    envFilePath,
    '# Test environment file for create-access-invite.mjs\n',
    'utf8',
  );

  return envFilePath;
};

const runScript = (
  args: string[],
  env: NodeJS.ProcessEnv = { NODE_ENV: 'test' },
): Promise<SpawnResult> => {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);

    child.on('close', (status) => {
      resolvePromise({
        status,
        stdout,
        stderr,
      });
    });
  });
};

const startPostgrestStub = async () => {
  const capturedRequests: CapturedRequest[] = [];

  activeServer = createServer(async (request, response) => {
    let rawBody = '';

    for await (const chunk of request) {
      rawBody += chunk.toString();
    }

    const body = rawBody
      ? (JSON.parse(rawBody) as
          Record<string, unknown> | Record<string, unknown>[])
      : {};

    const insertedRow = Array.isArray(body) ? body[0] : body;

    capturedRequests.push({
      body,
      method: request.method,
      url: request.url,
    });

    if (
      request.method === 'POST' &&
      request.url?.startsWith('/rest/v1/access_invites')
    ) {
      response.writeHead(201, {
        'Content-Type': 'application/json',
      });

      response.end(
        JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
          label: insertedRow?.label,
          access_duration_days: insertedRow?.access_duration_days ?? 7,
          first_accessed_at: null,
          expires_at: null,
          created_at: '2026-08-08T00:00:00.000Z',
        }),
      );

      return;
    }

    response.writeHead(404, {
      'Content-Type': 'application/json',
    });

    response.end(
      JSON.stringify({
        message: 'Not found',
      }),
    );
  });

  await new Promise<void>((resolveListen, reject) => {
    activeServer?.once('error', reject);

    activeServer?.listen(0, '127.0.0.1', () => resolveListen());
  });

  const address = activeServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine test server port.');
  }

  return {
    capturedRequests,
    supabaseUrl: `http://127.0.0.1:${address.port}`,
  };
};

afterEach(async () => {
  if (activeServer) {
    const server = activeServer;

    activeServer = undefined;

    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolveClose();
      });
    });
  }

  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('scripts/create-access-invite.mjs', () => {
  it('should describe the actual accepted access-duration range', async () => {
    const result = await runScript(['--help']);

    expect(result.status).toBe(0);

    expect(result.stdout).toContain('between 1 and 30');
  });

  it('should reject an access duration above the configured maximum', async () => {
    const envFilePath = await createTestEnvFile();

    const result = await runScript([
      '--env-file',
      envFilePath,
      '--label',
      'Test invite',
      '--days',
      '31',
    ]);

    expect(result.status).toBe(1);

    expect(result.stderr).toContain(
      '--days must be an integer between 1 and 30.',
    );
  });

  it('should create an HMAC-backed invite without starting its access window', async () => {
    const { capturedRequests, supabaseUrl } = await startPostgrestStub();

    const envFilePath = await createTestEnvFile();

    const result = await runScript(
      ['--env-file', envFilePath, '--label', 'Test invite', '--days', '14'],
      {
        NODE_ENV: 'test',

        ACCESS_GATE_CODE_SECRET: CODE_SECRET,

        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,

        SUPABASE_SECRET_KEY: ADMIN_KEY,

        SUPABASE_SERVICE_ROLE_KEY: '',
      },
    );

    expect(result.status).toBe(0);

    expect(result.stderr).toBe('');

    expect(result.stdout).not.toContain(CODE_SECRET);

    expect(result.stdout).not.toContain(ADMIN_KEY);

    const codeMatch = result.stdout.match(
      /code: (ACD-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4})/,
    );

    expect(codeMatch?.[1]).toBeDefined();

    const code = codeMatch?.[1] ?? '';

    const expectedHash = createHmac('sha256', CODE_SECRET)
      .update(code)
      .digest('hex');

    const insertRequest = capturedRequests.find(
      (request) => request.method === 'POST',
    );

    expect(insertRequest?.url).toContain('/rest/v1/access_invites');

    const insertedBody = Array.isArray(insertRequest?.body)
      ? insertRequest.body[0]
      : insertRequest?.body;

    expect(insertedBody).toEqual({
      code_hash: expectedHash,
      label: 'Test invite',
      access_duration_days: 14,
    });

    expect(result.stdout).toContain(`path: /?code=${code}`);

    expect(result.stdout).toContain('first_accessed_at: not started');

    expect(result.stdout).toContain('expires_at: starts on first access');
  });
});
