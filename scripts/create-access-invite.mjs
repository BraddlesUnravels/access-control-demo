import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const MINIMUM_SECRET_LENGTH = 32;
const MINIMUM_ACCESS_DURATION_DAYS = 1;
const MAXIMUM_ACCESS_DURATION_DAYS = 30;

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

const getOptionValue = (argv, index, optionName) => {
  const value = argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
};

const parseArgs = (argv) => {
  const args = {
    label: undefined,
    days: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--label') {
      args.label = getOptionValue(argv, index, '--label');
      index += 1;
      continue;
    }

    if (current === '--days') {
      args.days = getOptionValue(argv, index, '--days');
      index += 1;
      continue;
    }

    if (current === '--help' || current === '-h') {
      return {
        ...args,
        help: true,
      };
    }

    throw new Error(`Unknown option: ${current}`);
  }

  return args;
};

const printUsage = () => {
  process.stdout.write(
    [
      'Create an access-gate invite.',
      '',
      'Usage:',
      '  npm run invite:create -- --label "Acme recruiter"',
      '  npm run invite:create -- --label "Acme recruiter" --days 14',
      '',
      'Options:',
      '  --label <label>  Human-readable identifier for the invite.',
      '  --days <days>    Access duration from first successful redemption.',
      '                   Must be an integer between 1 and 30.',
      '                   If omitted, the database default is used.',
      '  --help, -h       Show this help message.',
      '',
    ].join('\n'),
  );
};

const parseAccessDurationDays = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const days = Number(value);

  if (
    !Number.isInteger(days) ||
    days < MINIMUM_ACCESS_DURATION_DAYS ||
    days > MAXIMUM_ACCESS_DURATION_DAYS
  ) {
    throw new Error(
      `--days must be an integer between ${MINIMUM_ACCESS_DURATION_DAYS} and ${MAXIMUM_ACCESS_DURATION_DAYS}.`,
    );
  }

  return days;
};

const normalizeInviteCode = (code) => {
  return code.trim().toUpperCase().replace(/\s+/g, '');
};

const hashInviteCode = (code, secret) => {
  return createHmac('sha256', secret)
    .update(normalizeInviteCode(code))
    .digest('hex');
};

const generateInviteCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let raw = '';

  for (const byte of bytes) {
    raw += alphabet[byte % alphabet.length];
  }

  return `ACD-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required.`);
  }

  return value;
};

const requireAccessGateCodeSecret = () => {
  const secret = requireEnv('ACCESS_GATE_CODE_SECRET');

  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `Environment variable ACCESS_GATE_CODE_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters.`,
    );
  }

  return secret;
};

const getSupabaseAdminKey = () => {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (secretKey) {
    return secretKey;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey) {
    return serviceRoleKey;
  }

  throw new Error(
    'Environment variable SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.',
  );
};

const createSupabaseAdminClient = () => {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const adminKey = getSupabaseAdminKey();

  return createClient(supabaseUrl, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

const createInvite = async ({ label, accessDurationDays }) => {
  const codeSecret = requireAccessGateCodeSecret();
  const code = generateInviteCode();
  const codeHash = hashInviteCode(code, codeSecret);
  const supabase = createSupabaseAdminClient();

  const insertPayload = {
    code_hash: codeHash,
    label,
    ...(accessDurationDays === undefined
      ? {}
      : { access_duration_days: accessDurationDays }),
  };

  const { data, error } = await supabase
    .from('access_invites')
    .insert(insertPayload)
    .select(
      [
        'id',
        'label',
        'access_duration_days',
        'first_accessed_at',
        'expires_at',
        'created_at',
      ].join(', '),
    )
    .single();

  if (error) {
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  if (data.first_accessed_at !== null || data.expires_at !== null) {
    throw new Error(
      'Invite was created with an unexpected active access window.',
    );
  }

  return {
    code,
    invite: data,
  };
};

const main = async () => {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const label = args.label?.trim();

  if (!label) {
    printUsage();
    throw new Error('--label is required.');
  }

  const accessDurationDays = parseAccessDurationDays(args.days);

  const { code, invite } = await createInvite({
    label,
    accessDurationDays,
  });

  process.stdout.write(
    [
      '',
      'Invite created.',
      '',
      `id: ${invite.id}`,
      `label: ${invite.label}`,
      `access_duration_days: ${invite.access_duration_days}`,
      `first_accessed_at: ${invite.first_accessed_at ?? 'not started'}`,
      `expires_at: ${invite.expires_at ?? 'starts on first access'}`,
      `created_at: ${invite.created_at}`,
      '',
      `code: ${code}`,
      `path: /?code=${encodeURIComponent(code)}`,
      '',
      'Store the code now. Only its HMAC digest is stored in the database.',
      '',
    ].join('\n'),
  );
};

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
