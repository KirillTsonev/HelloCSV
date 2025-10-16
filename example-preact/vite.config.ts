import { defineConfig, UserConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const base = mode === 'gh-pages' ? '/HelloCSV/' : '/';

  return {
    plugins: [preact(), tailwindcss()],
    base,
    resolve: {
      dedupe: ['preact'],
      alias: {
        'hello-csv/preact': path.resolve(__dirname, '../dist/preact/index.es.js'),
        'hello-csv/react': path.resolve(__dirname, '../dist/react/index.es.js'),
        'hello-csv/bundled': path.resolve(__dirname, '../dist/bundled/index.es.js'),
      },
    },
  };
});
