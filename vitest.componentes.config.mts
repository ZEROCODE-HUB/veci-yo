import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tercera suite: los componentes.
 *
 *   npm test                 unitarias. Logica pura, sin red. Rapidas.
 *   npm run test:componentes  pantallas y componentes, en jsdom.
 *   npm run test:rls         contra el Supabase real, con sesiones de verdad.
 *
 * Existe porque las otras dos dejan un hueco que se noto pulsando la app a
 * mano: una decision puede estar bien escrita y bien probada **y no estar
 * conectada**. `mostrarTipoTabs` se calculo en el hook, se probo en el hook,
 * y que la pantalla lo usara dependia de que alguien se acordara. Lo mismo
 * con el numero de lavadora, que se guardaba bien y no se pintaba en tres de
 * las cuatro pantallas donde sale una reserva.
 *
 * No hace falta `jest-expo`: la app ya corre en web --es como se prueba en el
 * navegador-- asi que `react-native` se resuelve a `react-native-web` y los
 * componentes se montan en jsdom como cualquier pagina.
 *
 * Lo que se comprueba aqui es **lo que se ve y lo que se pulsa**: textos,
 * roles y llamadas. Nunca estilos: NativeWind compila las clases fuera de
 * este entorno, y una prueba de colores se rompe cada vez que alguien cambia
 * un tono sin cambiar ningun comportamiento.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    globals: false,
    setupFiles: ["./src/pruebas/componentes.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "react-native": "react-native-web",
    },
  },
});
