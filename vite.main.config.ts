import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
      output: {
        // Electron Forge は package.json の "main" フィールド (.vite/build/main.js) を参照するため
        // エントリが index.ts でも出力を main.js に固定する
        entryFileNames: 'main.js',
      },
    },
  },
});
