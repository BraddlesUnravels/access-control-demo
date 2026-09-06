import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const schemaPath = resolve(process.cwd(), 'supabase/schema.sql');
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), 'access-control-demo-schema-'),
);
const dumpedSchemaPath = join(temporaryDirectory, 'schema.sql');
const normalizeSchema = (schema) =>
  schema.replace(/[\t ]+$/gm, '').replace(/\n+$/, '\n');
const supabaseCliVersion = process.env.SUPABASE_CLI_VERSION;
const command = supabaseCliVersion ? 'npx' : 'supabase';
const dumpArguments = [
  ...(supabaseCliVersion ? ['--yes', `supabase@${supabaseCliVersion}`] : []),
  'db',
  'dump',
  '--local',
  '--schema',
  'public,private',
  '--file',
  dumpedSchemaPath,
];

try {
  const result = spawnSync(command, dumpArguments, {
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error(
      'Unable to dump the local Supabase database. Ensure the local stack is running.',
      {
        cause: result.error,
      },
    );
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else if (process.argv.includes('--write')) {
    writeFileSync(
      schemaPath,
      normalizeSchema(readFileSync(dumpedSchemaPath, 'utf8')),
    );
  } else if (
    normalizeSchema(readFileSync(schemaPath, 'utf8')) !==
    normalizeSchema(readFileSync(dumpedSchemaPath, 'utf8'))
  ) {
    process.exitCode = 1;
    process.stderr.write(
      'Schema snapshot drift detected. Run "npm run schema:generate" after reviewing migrations.\n',
    );
  }
} finally {
  rmSync(temporaryDirectory, {
    recursive: true,
    force: true,
  });
}
