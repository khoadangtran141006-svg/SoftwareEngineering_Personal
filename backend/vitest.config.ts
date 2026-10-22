import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    exclude: ['**/*.e2e-spec.ts'],
    // Máy chậm (Windows, antivirus) có thể cần hơn 10 giây để khởi tạo module Nest lần đầu.
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
