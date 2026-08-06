import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const loadEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const parseArgs = (argv) => {
  const args = {
    label: undefined,
    expires: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--label') {
      args.label = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--expires') {
      args.expires = argv[index + 1];
      index += 1;
    }
  }

  return args;
};

const normalizeInviteCode = (code) => {
  return code.trim().toUpperCase().replace(/\s+/g, '');
};

const hashInviteCode = (code, secret) => {
  return createHash('sha256')
    .update(`${secret}:${normalizeInviteCode(code)}`)
    .digest('hex');
};

const generateInviteCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(10);
  let raw = '';

  for (const byte of bytes) {
    raw += alphabet[byte % alphabet.length];
  }

  return `ACD-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
};

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is required.`);
  }

  return value;
};

const main = async () => {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const args = parseArgs(process.argv.slice(2));
  const label = args.label?.trim();

  if (!label) {
    throw new Error(
      'Usage: npm run invite:create -- --label "Acme recruiter" [--expires 2026-12-31]',
    );
  }

  let expiresAt;

  if (args.expires) {
    const parsed = new Date(args.expires);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error('expires must be a valid date, for example 2026-12-31');
    }

    expiresAt = parsed.toISOString();
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const accessGateSecret = requireEnv('ACCESS_GATE_CODE_SECRET');
  const code = generateInviteCode();
  const codeHash = hashInviteCode(code, accessGateSecret);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from('access_invites')
    .insert({
      code_hash: codeHash,
      label,
      expires_at: expiresAt ?? null,
    })
    .select('id, label, expires_at, created_at')
    .single();

  if (error) {
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  process.stdout.write(
    [
      'Invite created.',
      `id: ${data.id}`,
      `label: ${data.label}`,
      `expires_at: ${data.expires_at ?? 'none'}`,
      `code: ${code}`,
      `path: /access?code=${encodeURIComponent(code)}`,
      '',
      'Store the code now. Only the hash is saved in the database.',
      '',
    ].join('\n'),
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
