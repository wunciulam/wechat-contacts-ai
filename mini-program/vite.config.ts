import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uni(),
  ],
  define: {
    'process.env': {
      SUPABASE_URL: JSON.stringify('https://ulgqiixqaxxgodyowrep.supabase.co'),
      SUPABASE_ANON_KEY: JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3FpaXhxYXh4Z29keW93cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTEwNDcsImV4cCI6MjA4NzI4NzA0N30.ZgxdR2MwwzBSzhXCkk0JPJdnijKr-qouxOG0aQ1S8Xg'),
    }
  },
  build: {
    sourcemap: true,
  },
})
