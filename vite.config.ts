import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to suppress externalized module warnings
const suppressExternalWarnings = () => {
  return {
    name: 'suppress-external-warnings',
    config() {
      return {
        customLogger: {
          warn(msg: string) {
            // Suppress warnings about externalized modules
            if (msg.includes('externalized for browser compatibility')) return;
            console.warn(msg);
          },
          warnOnce(msg: string) {
            if (msg.includes('externalized for browser compatibility')) return;
            console.warn(msg);
          },
          info: console.info,
          error: console.error,
          clearScreen: () => {},
          hasWarned: false,
          hasErrorLogged: () => false,
        },
      };
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), suppressExternalWarnings()],
  resolve: {
    alias: {
      // Provide browser-compatible shims for Node.js modules
      path: 'path-browserify',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    commonjsOptions: {
      ignoreDynamicRequires: true,
    },
  },
})
