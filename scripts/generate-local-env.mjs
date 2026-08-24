import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import {
  STUDENT_1_DEMO_PASSWORD,
  STUDENT_2_DEMO_PASSWORD,
  ADMIN_DEMO_PASSWORD,
} from '../lib/demo-accounts.ts';

const stripOuterQuotes = (value) => {
  if (!value) return value;
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
};

const parseStatusEnv = (rawOutput) => {
  return rawOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes('='))
    .filter((line) => !line.startsWith('Stopped services:'))
    .reduce((envMap, line) => {
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      const value = stripOuterQuotes(line.slice(separatorIndex + 1).trim());

      if (key) envMap[key] = value;

      return envMap;
    }, {});
};

const main = () => {
  let rawStatusOutput = '';

  try {
    rawStatusOutput = execSync('supabase status -o env', {
      encoding: 'utf-8',
    });
  } catch {
    throw new Error(
      'Unable to read Supabase local status. Ensure Supabase CLI is installed and run `npm run infra:up` first.',
    );
  }

  const statusEnv = parseStatusEnv(rawStatusOutput);
  const apiUrl = statusEnv.API_URL;
  const publishableKey = statusEnv.PUBLISHABLE_KEY ?? statusEnv.ANON_KEY;
  const serviceRoleKey = statusEnv.SERVICE_ROLE_KEY ?? statusEnv.SECRET_KEY;

  if (!apiUrl || !publishableKey) {
    throw new Error(
      'Missing API_URL or PUBLISHABLE_KEY in `supabase status -o env` output. Verify local Supabase is running.',
    );
  }

  const envFileContent = [
    '# Generated from local Supabase status output.',
    '# Re-run `npm run infra:env` after restarting local Supabase if values change.',
    `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    serviceRoleKey ? `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}` : undefined,
    'ACCESS_GATE_DISABLED=false',
    'ACCESS_GATE_CODE_SECRET=local-access-gate-secret-that-meets-length-requirements',
    'ACCESS_GATE_COOKIE_SECRET=replace-with-safe-secret-that-meets-length-requirements',
    ' ',
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync('.env.local', envFileContent, 'utf-8');
  process.stdout.write('Created .env.local from local Supabase status.\n');
  process.stdout.write(
    [
      '',
      '============================================================',
      '================== SEEDED LOGIN USERS ======================',
      '============================================================',
      '',
      'Student login:',
      '  Email: student1@lms.com',
      `  Password: ${STUDENT_1_DEMO_PASSWORD}`,
      '',
      'Student login:',
      '  Email: student2@lms.com',
      `  Password: ${STUDENT_2_DEMO_PASSWORD}`,
      '',
      'Admin login:',
      '  Email: admin@lms.com',
      `  Password: ${ADMIN_DEMO_PASSWORD}`,
      '',
      '============================================================',
    ].join('\n'),
  );
};

main();
