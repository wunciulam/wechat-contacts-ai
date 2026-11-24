import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chatFollowupLocal, CHAT_PREVIEW_APP_ID, CHAT_PREVIEW_PORT, CHAT_PREVIEW_URL } from './server/chatFollowupLocal';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const chatPreview = mode === 'chat-local';
    return {
      base: '/',
      server: {
        port: chatPreview ? CHAT_PREVIEW_PORT : 3000,
        host: chatPreview ? '127.0.0.1' : '0.0.0.0',
        strictPort: chatPreview,
      },
      plugins: [react(), tailwindcss(), ...(chatPreview ? [chatFollowupLocal(env)] : [])],
      build: {
        rollupOptions: {
          output: {
            assetFileNames: asset => asset.names.includes('chi_sim.traineddata.gz')
              ? 'ocr/[name][extname]' : 'assets/[name]-[hash][extname]',
          },
          input: {
            main: path.resolve(__dirname, 'index.html'),
            acceptance: path.resolve(__dirname, 'ui-acceptance.html'),
            modules: path.resolve(__dirname, 'module-acceptance.html'),
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        ...(chatPreview ? { 'import.meta.env.VITE_APP_ID': JSON.stringify(CHAT_PREVIEW_APP_ID) } : {}),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(chatPreview ? CHAT_PREVIEW_URL : env.VITE_SUPABASE_URL || 'https://ulgqiixqaxxgodyowrep.supabase.co'),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(chatPreview ? 'chat-local-preview' : env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3FpaXhxYXh4Z29keW93cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTEwNDcsImV4cCI6MjA4NzI4NzA0N30.ZgxdR2MwwzBSzhXCkk0JPJdnijKr-qouxOG0aQ1S8Xg')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
