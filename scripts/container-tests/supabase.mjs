import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { run } from './docker.mjs';

const parseEnvOutput = (output) => {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('='))
    .reduce((values, line) => {
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^"|"$/g, '');

      if (key) {
        values[key] = value;
      }

      return values;
    }, {});
};

const normalizeInviteCode = (code) => {
  return code.trim().toUpperCase().replace(/\s+/g, '');
};

const hashInviteCode = (code, secret) => {
  return createHmac('sha256', secret)
    .update(normalizeInviteCode(code))
    .digest('hex');
};

export const getProjectId = (configPath = 'supabase/config.toml') => {
  const config = readFileSync(configPath, 'utf8');
  const match = config.match(/^project_id\s*=\s*"([^"]+)"/m);

  if (!match) {
    throw new Error(`Unable to read project_id from ${configPath}.`);
  }

  return match[1];
};

export const getSupabaseEnvironment = ({ cliVersion }) => {
  const statusOutput = run(
    'npx',
    ['--yes', `supabase@${cliVersion}`, 'status', '-o', 'env'],
    { capture: true },
  );

  const environment = parseEnvOutput(statusOutput);

  const externalSupabaseUrl = environment.API_URL;

  const publishableKey = environment.PUBLISHABLE_KEY ?? environment.ANON_KEY;

  const serviceRoleKey = environment.SERVICE_ROLE_KEY ?? environment.SECRET_KEY;

  if (!externalSupabaseUrl) {
    throw new Error('Supabase status did not return API_URL.');
  }

  if (!publishableKey) {
    throw new Error(
      'Supabase status did not return PUBLISHABLE_KEY or ANON_KEY.',
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Supabase status did not return SERVICE_ROLE_KEY or SECRET_KEY.',
    );
  }

  return {
    externalSupabaseUrl,
    publishableKey,
    serviceRoleKey,
  };
};

export const createStageInvite = async ({
  supabaseUrl,
  serviceRoleKey,
  codeSecret,
}) => {
  const code = `ACD-STAGE-${randomBytes(8).toString('hex').toUpperCase()}`;

  const codeHash = hashInviteCode(code, codeSecret);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from('access_invites')
    .insert({
      code_hash: codeHash,
      label: 'Container stage integration',
      access_duration_days: 1,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(
      `Unable to create container-stage invite: ${
        error?.message ?? 'missing invite id'
      }.`,
    );
  }

  return code;
};

export const getSupabaseAuthCookieName = (supabaseUrl) => {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  if (!projectRef) {
    throw new Error('Unable to derive the Supabase auth cookie name.');
  }

  return `sb-${projectRef}-auth-token`;
};

export const createAuthenticatedCookieJar = async ({
  baseCookieJar,
  account,
  supabaseUrl,
  publishableKey,
  authCookieName,
}) => {
  const authCookies = new Map();

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: {
      name: authCookieName,
    },
    cookies: {
      getAll() {
        return [...authCookies.entries()].map(([name, value]) => ({
          name,
          value,
        }));
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          if (value) {
            authCookies.set(name, value);
          } else {
            authCookies.delete(name);
          }
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword(account);

  if (error) {
    throw new Error(
      `Unable to authenticate ${account.email}: ${error.message}`,
    );
  }

  const cookieJar = baseCookieJar.clone();

  authCookies.forEach((value, name) => {
    cookieJar.set(name, value);
  });

  return cookieJar;
};
