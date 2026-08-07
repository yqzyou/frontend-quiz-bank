// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://frontend-quiz-bank.vercel.app',
  integrations: [react()],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
        '@lib': '/src/lib',
        '@islands': '/src/islands',
        '@components': '/src/components',
      },
    },
  },
});
