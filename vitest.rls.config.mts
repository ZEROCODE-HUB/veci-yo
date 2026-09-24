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
    // Borra las reservas marcadas antes de empezar; ningun archivo
    // tiene que acordarse de hacerlo.
    globalSetup: ["./supabase/tests/limpieza-global.ts"],
  },
  resolve: {
    /*
      El orden importa: el alias mas especifico va primero, o `@` se lo come.

      `@/shared/services/supabase` es el singleton de la app, que guarda la
      sesion en SecureStore y arrastra `react-native`. En Node no existe, asi
      que se sustituye por un cliente equivalente cuya sesion se abre con una
      cuenta de prueba. Es lo que permite que una prueba llame a las funciones
      del repositorio de la app en vez de a HTTP crudo, y compruebe de paso el
      mapeo de datos.
    */
    alias: [
      {
        find: /^@\/shared\/services\/supabase$/,
        replacement: path.resolve(__dirname, "supabase/tests/recorridos/cliente.ts"),
      },
      { find: /^@\//, replacement: path.resolve(__dirname, "src") + "/" },
    ],
  },
});
