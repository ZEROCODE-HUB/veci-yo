import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * El linter de VeciYo.
 *
 * Existe por un fallo concreto: `MisReservas` tenía un `return null` antes de
 * un `useMemo`, o sea que llamaba a menos hooks en unos roles que en otros.
 * Al cambiar de rol sin desmontar la pantalla --que es lo que hace Marcela
 * desde el selector de la cabecera-- React tiraba «Rendered fewer hooks than
 * expected» y se caía entera. Lo encontré escribiendo una prueba de
 * componente y sospechando. `rules-of-hooks` lo dice sola, siempre, sin que
 * nadie tenga que acertar con la prueba.
 *
 * **Empieza estrecho a propósito.** Con el conjunto «recomendado» completo
 * salen 322 avisos, de los cuales 183 son `any` --una decisión de tipado que
 * se toma aparte-- y 49 son `require()` de recursos, que es como se cargan
 * las imágenes en React Native y aquí no se va a cambiar. Un linter que saca
 * trescientos avisos que nadie arregla no protege nada: enseña a ignorar la
 * salida.
 *
 * Lo que hay hoy:
 *
 *   - `rules-of-hooks` en **error**, con cero incumplimientos. Es un trinquete:
 *     no arregla nada hoy e impide que vuelva a entrar.
 *   - `exhaustive-deps` en **aviso**, con 24. Son de dos clases distintas y
 *     conviene mirarlas una a una, no arreglarlas en bloque: añadir una
 *     dependencia puede meter un bucle de renders.
 *
 * Lo que está medido y **pendiente de decidir**: 90 variables e importaciones
 * sin usar. Es código muerto de verdad, del que este proyecto ya persigue con
 * `buscar-botones-muertos` y `buscar-funciones-sueltas`, pero `no-unused-vars`
 * no tiene arreglo automático: son noventa ediciones a mano y merecen su
 * propia pasada.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "android/**",
      "ios/**",
      "supabase/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
