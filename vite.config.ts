import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["loom.svg"],
      manifest: {
        name: "Loom Circuit Workbench",
        short_name: "Loom",
        description: "Build, simulate, and understand digital circuits.",
        theme_color: "#182d2a",
        background_color: "#f4f7f2",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/loom.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          canvas: ["konva", "react-konva"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
