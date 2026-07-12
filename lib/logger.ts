import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

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
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : {
        target: 'pino/file',
        options: {
          mkdir: true,
          destination: 'logs/api.log',
        },
      },
});
