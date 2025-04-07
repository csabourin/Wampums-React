import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1','0b4c775b-f52c-4a71-bfea-7d3ef1f1deae-00-ihknl8yle6t1.kirk.replit.dev'],
  }
})
