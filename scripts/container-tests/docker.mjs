import { execFileSync } from 'node:child_process';

export const run = (command, args, { capture = false, ...options } = {}) => {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...options,
  });
};

export const getContainerNetwork = (containerName) => {
  const networkJson = run(
    'docker',
    [
      'inspect',
      '--format',
      '{{json .NetworkSettings.Networks}}',
      containerName,
    ],
    { capture: true },
  );

  const networks = Object.keys(JSON.parse(networkJson));

  if (networks.length === 0) {
    throw new Error(
      `Container ${containerName} is not attached to a Docker network.`,
    );
  }

  return networks[0];
};

export const removeContainer = (containerName) => {
  try {
    run('docker', ['rm', '--force', containerName], { capture: true });
  } catch {
    // Cleanup is deliberately idempotent.
  }
};

export const printContainerLogs = (containerName) => {
  try {
    run('docker', ['logs', containerName]);
  } catch {
    // No container exists when image building or creation failed.
  }
};
