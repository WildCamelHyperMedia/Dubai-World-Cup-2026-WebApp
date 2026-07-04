import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Dubai-World-Cup-2026-WebApp/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.png",
        "icons/icon-192x192.png",
        "icons/icon-512x512.png",
        "icons/apple-touch-icon.png",
        "fonts/**/*.woff2",
        "fonts/fonts.css",
      ],
      manifest: {
        name: "Dubai Racing Cup AR Journey",
        short_name: "DRC Journey",
        description:
          "Embark on a heritage trail and customize your digital horse companion at the Dubai Racing Cup.",
        theme_color: "#050810",
        background_color: "#050810",
        display: "standalone",
        orientation: "portrait",
        start_url: "/Dubai-World-Cup-2026-WebApp/",
        scope: "/Dubai-World-Cup-2026-WebApp/",
        icons: [
          {
            src: "/Dubai-World-Cup-2026-WebApp/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/Dubai-World-Cup-2026-WebApp/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/Dubai-World-Cup-2026-WebApp/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/Dubai-World-Cup-2026-WebApp/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // png deliberately excluded: the heavy craft/heritage/sprite images
        // (~47 MB) would otherwise be precached on first visit; the
        // static-images runtime CacheFirst rule below covers them on demand.
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/images\/combos\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "combo-images",
              expiration: {
                maxEntries: 5000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(mp4|webm)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "video-assets",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              rangeRequests: true,
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-images",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
    dedupe: ["react", "react-dom", "three"],
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          "react-three": ["@react-three/fiber", "@react-three/drei"],
          vendor: ["react", "react-dom", "wouter"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
