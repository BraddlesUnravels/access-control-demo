import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

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

      if (key) {
        envMap[key] = value;
      }

      return envMap;
    }, {});
};

const isPrivateIpv4 = (address) => {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
};

const isVirtualInterface = (interfaceName) => {
  const normalizedName = interfaceName.toLowerCase();

  return ['awdl', 'bridge', 'docker', 'llw', 'utun', 'veth', 'vmnet'].some(
    (prefix) => normalizedName.startsWith(prefix),
  );
};

const interfacePriority = (interfaceName) => {
  const normalizedName = interfaceName.toLowerCase();

  const preferredInterfaces = ['en0', 'en1', 'wlan0', 'wifi0', 'eth0', 'eth1'];

  const preferredIndex = preferredInterfaces.indexOf(normalizedName);

  return preferredIndex === -1 ? preferredInterfaces.length : preferredIndex;
};

const getLocalNetworkAddress = () => {
  const configuredAddress = process.env.LOCAL_NETWORK_HOST?.trim();

  if (configuredAddress) {
    return configuredAddress;
  }

  const candidates = Object.entries(networkInterfaces())
    .filter(([interfaceName]) => !isVirtualInterface(interfaceName))
    .flatMap(([interfaceName, addresses]) =>
      (addresses ?? [])
        .filter(
          (networkAddress) =>
            networkAddress.family === 'IPv4' &&
            !networkAddress.internal &&
            isPrivateIpv4(networkAddress.address),
        )
        .map((networkAddress) => ({
          address: networkAddress.address,
          interfaceName,
          priority: interfacePriority(interfaceName),
        })),
    )
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.interfaceName.localeCompare(right.interfaceName);
    });

  return candidates[0]?.address;
};

const replaceUrlHostname = (rawUrl, hostname) => {
  const url = new URL(rawUrl);

  url.hostname = hostname;

  return url.toString().replace(/\/$/, '');
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

  const localApiUrl = statusEnv.API_URL;
  const publishableKey = statusEnv.PUBLISHABLE_KEY ?? statusEnv.ANON_KEY;

  if (!localApiUrl || !publishableKey) {
    throw new Error(
      'Missing API_URL or PUBLISHABLE_KEY in `supabase status -o env` output. Verify local Supabase is running.',
    );
  }

  const localNetworkAddress = getLocalNetworkAddress();

  const publicApiUrl = localNetworkAddress
    ? replaceUrlHostname(localApiUrl, localNetworkAddress)
    : localApiUrl;

  const envFileContent = [
    '# Generated from local Supabase status output.',
    '# Re-run `npm run infra:env` if the local network changes.',
    `NEXT_PUBLIC_SUPABASE_URL=${publicApiUrl}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    '',
  ].join('\n');

  writeFileSync('.env.local', envFileContent, 'utf-8');

  process.stdout.write('Created .env.local from local Supabase status.\n');

  if (localNetworkAddress) {
    process.stdout.write(
      `Using local network address: ${localNetworkAddress}\n`,
    );
  } else {
    process.stdout.write(
      'No private network address detected; using the Supabase loopback URL.\n',
    );
  }

  process.stdout.write(`Supabase browser URL: ${publicApiUrl}\n`);

  process.stdout.write(
    [
      '',
      '============================================================',
      '================== SEEDED LOGIN USERS ======================',
      '============================================================',
      '',
      'Student login:',
      '  Email: student1@lms.com',
      '  Password: password123',
      '',
      'Student login:',
      '  Email: student2@lms.com',
      '  Password: password123',
      '',
      'Admin login:',
      '  Email: admin@lms.com',
      '  Password: password123',
      '',
      '============================================================',
      '',
    ].join('\n'),
  );
};

main();
