import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { validateBuildEnvironment } from "./scripts/build-environment.mjs";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  let buildTarget = "local";
  if (command === "build") {
    const result = validateBuildEnvironment({ ...loadEnv(mode, process.cwd(), ""), ...process.env });
    buildTarget = result.target;
    console.log(`[build-env] environment=${result.target} api=${result.api}`);
  }
  return ({
  base: "/",
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
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react"]
        }
      }
    }
  },
  define: {
    "process.env": {},
    "__APP_VERSION__": JSON.stringify(process.env.npm_package_version),
    "__BUILD_TARGET__": JSON.stringify(buildTarget),
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"]
  },
  preview: {
    port: 4173,
    host: true,
  },
  // vitest config — not part of Vite's public types but safe to co-locate
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  } as any);
});
