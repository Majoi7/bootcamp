import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";   // ← AJOUT

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    tsconfigPaths(),
    react(),
    tailwindcss(),   // ← AJOUT
  ],
  build: {
    outDir: "output/static",
  },
});