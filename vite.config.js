import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
  ,
  build: {
    // Enable source maps for easier debugging of runtime errors in production bundles
    sourcemap: true
  }
}) 