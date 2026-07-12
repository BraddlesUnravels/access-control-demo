import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const RLS_SQL_PATH = 'supabase/tests/rls_checks.sql';
const SUPABASE_DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_contour';

const runRlsChecks = () => {
  const sql = readFileSync(RLS_SQL_PATH, 'utf-8');
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      SUPABASE_DB_CONTAINER,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
    ],
    {
      input: sql,
      encoding: 'utf-8',
      stdio: ['pipe', 'inherit', 'inherit'],
    },
  );

  if (result.error) {
    throw new Error(
      `Failed to run RLS checks. Ensure Docker is running and container "${SUPABASE_DB_CONTAINER}" exists.`,
    );
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
};

runRlsChecks();
