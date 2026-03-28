import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
      output: {
        // main.ts と同様に、BrowserWindow の preload パス指定に合わせる
        entryFileNames: 'preload.js',
      },
    },
  },
});
