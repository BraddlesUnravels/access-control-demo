import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SQL_PATHS = [
  'supabase/tests/rls_checks.sql',
  'supabase/tests/validation_checks.sql',
  'supabase/tests/access_gate_checks.sql',
];

const SUPABASE_DB_CONTAINER =
  process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_access-control-demo';

const runSqlFile = (sqlPath) => {
  process.stdout.write(`\nRunning ${sqlPath}\n\n`);

  const sql = readFileSync(sqlPath, 'utf-8');

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
      `Failed to run ${sqlPath}. Ensure Docker is running and container "${SUPABASE_DB_CONTAINER}" exists.`,
      {
        cause: result.error,
      },
    );
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
};

for (const sqlPath of SQL_PATHS) {
  runSqlFile(sqlPath);
}
