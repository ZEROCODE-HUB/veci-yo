import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Pruebas contra el Supabase real. Leen `.env.local` y abren sesiones con los
 * usuarios de prueba, asi que comprueban las politicas tal como las aplica
 * PostgREST, no una imitacion.
 *
 * Secuenciales y con timeout alto: cada caso hace varias idas y vueltas por
 * red, y algunas escriben filas que otro caso lee.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
