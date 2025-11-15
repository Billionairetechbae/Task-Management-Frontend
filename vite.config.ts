import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Add these for Vercel deployment
  build: {
    outDir: "dist",
    sourcemap: mode === "development", // Only generate sourcemaps in development
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react"] // Add other UI libraries you're using
        }
      }
    }
  },
  // Define global constants
  define: {
    'process.env': {},
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  // Preview server for build testing
  preview: {
    port: 4173,
    host: true
  }
}));