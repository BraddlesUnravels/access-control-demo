import pino from 'pino';
import { isAzureEnv } from './utils';

const usePrettyLogs = !isAzureEnv() && process.stdout.isTTY === true;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      '["api-key"]',
      '["x-api-key"]',
      'accessToken',
      'refreshToken',
    ],
    censor: '[Redacted]',
  },
  ...(usePrettyLogs
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});
