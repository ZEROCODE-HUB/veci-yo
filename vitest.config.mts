import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tres suites separadas, porque se ejecutan de forma muy distinta:
 *
 *   npm test                  unitarias. Logica pura, sin red. Rapidas.
 *   npm run test:componentes  pantallas y componentes, en jsdom.
 *   npm run test:rls          contra el Supabase real, con sesiones de verdad.
 *
 * Las de RLS no se ejecutan por defecto: necesitan credenciales y tardan.
 * Son, sin embargo, las que cubren lo que de verdad protege al producto --el
 * aislamiento entre condominios y entre viviendas-- y por eso existen.
 *
 * Los componentes salen de aqui y tienen su propia configuracion, porque
 * necesitan jsdom. Esta suite se queda en `environment: "node"` y solo con
 * `.ts`: asi sigue siendo de segundos y no arrastra un DOM para comprobar una
 * funcion pura.
 *
 * (Aqui decia que los componentes quedaban fuera «porque exigen el entorno de
 * Expo». Ya no: la app corre en web, asi que `react-native` se resuelve a
 * `react-native-web` y no hace falta `jest-expo`.)
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
