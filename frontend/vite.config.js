import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import process from 'node:process'

export default defineConfig({
  plugins: [
    react(),
    // Installable PWA for clinic tablets: offline app shell + safe-listed
    // runtime caching for hashed assets. API traffic is NEVER cached — PHI
    // must not outlive the session in a CacheStorage.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'NeuroSense Advanced — AI Alzheimer\'s Detection',
        short_name: 'NeuroSense',
        description: 'Multimodal AI platform for Alzheimer\'s detection using MRI, cognitive assessment, and behavioral analysis.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0B1120',
        theme_color: '#863bff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Google Fonts: cache-first, safe (non-PHI static assets).
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        // Keep the SW bundle lean; no PHI ever passes through these handlers.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
    // Bundle composition report — opt in with `VITE_ANALYZE=1 npm run build`.
    process.env.VITE_ANALYZE === '1' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
      }),
  ].filter(Boolean),
  envDir: '../',
  build: {
    rollupOptions: {
      output: {
        // Only react/react-dom/router/query go into a shared vendor chunk —
        // they're on every route and rarely change, so app deploys don't
        // invalidate them. Everything else (icon sets, toasts, dropzone)
        // splits naturally: a manual misc chunk would consolidate every
        // page's icons into the initial load and make first paint heavier.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const m = id.match(/node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)/)
          const CORE_PKGS = [
            'react', 'react-dom', 'react-router', 'react-router-dom',
            '@remix-run/router', 'scheduler', 'use-sync-external-store',
            '@tanstack/react-query', '@tanstack/query-core',
          ]
          if (m && CORE_PKGS.includes(m[1])) return 'vendor-core'
          // Separate heavy libraries so pages that don't need them load faster.
          // NiiVue (~2 MB) is deferred to MRI/results views only.
          if (m && m[1] === '@niivue/niivue') return 'vendor-niivue'
          // Animation library deferred to animated routes.
          if (m && m[1] === 'framer-motion') return 'vendor-motion'
          // Recharts (~150 kB) deferred to dashboard/results.
          if (m && m[1] === 'recharts') return 'vendor-charts'
          return undefined
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    // e2e/*.spec.js belongs to Playwright (`npm run e2e`), not vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

