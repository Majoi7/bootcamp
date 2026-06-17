// vite.config.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";


export default defineConfig({
  tanstackStart: {
    server: { entry: "router" },
    routes: {
      routeFilePrefix: "~", // ou enlève cette ligne si pas de préfixe
      routeDir: "src/routes", // ← ajoute ceci
    },
  },
 nitro: {
  preset: "vercel",
  output: {
    dir: "output",                      // ⇐ dossier racine visible par Vercel
    serverDir: "output/functions/__server.func",
    publicDir: "output/static",
  },
},
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    tsconfigPaths(),
  ],
} as any);