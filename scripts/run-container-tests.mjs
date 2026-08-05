import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const imageName = process.env.CONTAINER_IMAGE ?? 'access-control-demo:stage';
const containerName = process.env.CONTAINER_NAME ?? 'access-control-demo-stage';
const hostPort = process.env.CONTAINER_PORT ?? '3100';
const supabaseCliVersion = process.env.SUPABASE_CLI_VERSION ?? '2.110.0';
const sourceRepository = [
  process.env.GITHUB_SERVER_URL,
  process.env.GITHUB_REPOSITORY,
]
  .filter(Boolean)
  .join('/');

const run = (command, args, { capture = false, ...options } = {}) => {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...options,
  });
};

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

      if (key) values[key] = value;

      return values;
    }, {});
};

const getProjectId = () => {
  const config = readFileSync('supabase/config.toml', 'utf8');
  const match = config.match(/^project_id\s*=\s*"([^"]+)"/m);

  if (!match) {
    throw new Error('Unable to read project_id from supabase/config.toml.');
  }

  return match[1];
};

const getContainerNetwork = (container) => {
  const networkJson = run(
    'docker',
    ['inspect', '--format', '{{json .NetworkSettings.Networks}}', container],
    { capture: true },
  );
  const networks = Object.keys(JSON.parse(networkJson));

  if (networks.length === 0) {
    throw new Error(
      `Container ${container} is not attached to a Docker network.`,
    );
  }

  return networks[0];
};

const waitForHealth = async (url) => {
  const attempts = 40;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(4_000),
      });

      if (response.ok) {
        const body = await response.json();

        if (body.status === 'ok') return;
      }
    } catch {
      // The application container may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  throw new Error(`Application did not become healthy at ${url}.`);
};

const assertStatus = async (url, expectedStatus) => {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(5_000),
  });

  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected ${url} to return ${expectedStatus}, received ${response.status}.`,
    );
  }
};

const removeApplicationContainer = () => {
  try {
    run('docker', ['rm', '--force', containerName], { capture: true });
  } catch {
    // Cleanup is deliberately idempotent.
  }
};

const printApplicationLogs = () => {
  try {
    run('docker', ['logs', containerName]);
  } catch {
    // No container exists when image building or creation failed.
  }
};

const main = async () => {
  const projectId = getProjectId();
  const kongContainerName = `supabase_kong_${projectId}`;
  const networkName = getContainerNetwork(kongContainerName);
  const internalSupabaseUrl = `http://${kongContainerName}:8000`;

  const statusOutput = run(
    'npx',
    ['--yes', `supabase@${supabaseCliVersion}`, 'status', '-o', 'env'],
    { capture: true },
  );

  const supabaseEnv = parseEnvOutput(statusOutput);
  const publishableKey = supabaseEnv.PUBLISHABLE_KEY ?? supabaseEnv.ANON_KEY;

  if (!publishableKey) {
    throw new Error(
      'Supabase status did not return PUBLISHABLE_KEY or ANON_KEY.',
    );
  }

  removeApplicationContainer();

  try {
    run('docker', [
      'build',
      '--file',
      'docker/Dockerfile',
      '--progress',
      'plain',
      '--build-arg',
      `NEXT_PUBLIC_SUPABASE_URL=${internalSupabaseUrl}`,
      '--build-arg',
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
      '--build-arg',
      `SOURCE_REPOSITORY=${sourceRepository}`,
      '--tag',
      imageName,
      '.',
    ]);

    run('docker', [
      'run',
      '--detach',
      '--name',
      containerName,
      '--network',
      networkName,
      '--publish',
      `${hostPort}:3000`,
      '--env',
      `NEXT_PUBLIC_SUPABASE_URL=${internalSupabaseUrl}`,
      '--env',
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
      imageName,
    ]);

    const applicationUrl = `http://127.0.0.1:${hostPort}`;

    await waitForHealth(`${applicationUrl}/api/health`);

    run('docker', [
      'exec',
      containerName,
      'node',
      '-e',
      [
        `const url = ${JSON.stringify(`${internalSupabaseUrl}/auth/v1/health`)};`,
        `const key = ${JSON.stringify(publishableKey)};`,
        'fetch(url, {',
        '  headers: { apikey: key },',
        '  signal: AbortSignal.timeout(5000),',
        '})',
        '  .then((response) => {',
        '    if (!response.ok) {',
        '      throw new Error(',
        '        `Supabase Auth health returned ${response.status}`,',
        '      );',
        '    }',
        '  })',
        '  .catch((error) => {',
        '    console.error(error);',
        '    process.exit(1);',
        '  });',
      ].join('\n'),
    ]);

    await assertStatus(`${applicationUrl}/auth/login`, 200);
    await assertStatus(`${applicationUrl}/api/consultations`, 401);

    process.stdout.write(
      [
        '',
        'Container integration stage passed:',
        '- production Next.js image built successfully',
        '- application container passed its health check',
        '- application container reached the Supabase Auth container',
        '- login route rendered successfully',
        '- protected API rejected an unauthenticated request',
        '',
      ].join('\n'),
    );
  } catch (error) {
    printApplicationLogs();
    throw error;
  } finally {
    removeApplicationContainer();
  }
};

await main();
