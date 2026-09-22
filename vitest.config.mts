import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Dos suites separadas, porque se ejecutan de forma muy distinta:
 *
 *   npm test            unitarias. Logica pura, sin red. Rapidas.
 *   npm run test:rls    contra el Supabase real, con sesiones de verdad.
 *
 * Las de RLS no se ejecutan por defecto: necesitan credenciales y tardan.
 * Son, sin embargo, las que cubren lo que de verdad protege al producto --el
 * aislamiento entre condominios y entre viviendas-- y por eso existen.
 *
 * Los componentes de React Native quedan fuera a proposito: exigen el entorno
 * de Expo (jest-expo o un preset equivalente) y cubren mucho menos riesgo que
 * una politica de seguridad mal escrita.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
