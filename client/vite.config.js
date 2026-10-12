import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (upstream, incoming, outgoing) => {
            const abort = () => { if (!outgoing.writableEnded && !upstream.destroyed) upstream.destroy(); };
            const cleanup = () => { incoming.removeListener('aborted', abort); outgoing.removeListener('close', abort); outgoing.removeListener('finish', cleanup); };
            incoming.on('aborted', abort); outgoing.on('close', abort); outgoing.on('finish', cleanup); upstream.on('close', cleanup);
          });
        },
      },
    },
  },
});
