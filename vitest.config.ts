import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const serverOnlyTestStub = fileURLToPath(
  new URL('./test/server-only.ts', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      'server-only': serverOnlyTestStub,
    },
    tsconfigPaths: true,
  },

  test: {
    clearMocks: true,
    restoreMocks: true,

    projects: [
      {
        extends: true,

        test: {
          name: 'node',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },

      {
        extends: true,

        plugins: [react()],

        optimizeDeps: {
          include: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'vitest-browser-react',
            'clsx',
            'lucide-react',
            'tailwind-merge',
            '@radix-ui/react-label',
          ],
        },

        test: {
          name: 'browser',
          include: ['test/**/*.test.tsx'],

          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
