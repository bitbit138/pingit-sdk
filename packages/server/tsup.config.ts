import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  // Bundle @pingit/contracts so the produced dist is fully self-contained.
  noExternal: ['@pingit/contracts'],
  clean: true,
  sourcemap: true,
  dts: false,
});
