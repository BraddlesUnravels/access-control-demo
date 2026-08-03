import os from 'node:os';
import type { NextConfig } from 'next';

const isPrivateIpv4 = (address: string): boolean =>
  address.startsWith('10.') ||
  address.startsWith('192.168.') ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(address);

const localDevOrigins = Object.values(os.networkInterfaces())
  .flatMap((interfaces) => interfaces ?? [])
  .filter(
    (network) =>
      network.family === 'IPv4' &&
      !network.internal &&
      isPrivateIpv4(network.address),
  )
  .map((network) => network.address);

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: localDevOrigins,
};

export default nextConfig;
