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
 *   - `exhaustive-deps` en **aviso**, con **cero**. Eran 24 y se miraron una a
 *     una, que era lo que hacía falta: no se arreglan en bloque porque añadir
 *     una dependencia puede meter un bucle de renders, o borrar lo que la
 *     persona está escribiendo en un formulario.
 *
 *     Siete eran `query.data ?? []` --un array nuevo en cada render, así que
 *     los `useMemo` de debajo no memorizaban nada--: ahora es `listaDe()`.
 *     Cinco eran `useSharedValue` de Reanimated, que son estables por diseño y
 *     se pueden poner en las dependencias sin más. Las de formularios pedían
 *     memorizar el `initial` o tomar el `reset` suelto, que react-hook-form sí
 *     garantiza estable. Y una escondía un defecto: el número de menores de un
 *     acompañante se calculaba con la lista del render anterior.
 *
 *   - `no-unused-vars` en **error**, con tres excepciones escritas. Eran 95
 *     --70 importaciones y 25 variables-- y esa pasada ya se hizo: lo que
 *     quedaba de las 95 está en el historial y en `REVISAR-A-OJO.md`.
 *
 * **La pasada sacó cosas que no eran código muerto.** Cuatro cadenas de datos
 * terminadas y desconectadas del último eslabón --los turnos del guardia, el
 * `onBlur` de cinco campos de correspondencia, el indicador de guardado del
 * formulario de ubicación, el cupo de estacionamiento duplicado--, una copia
 * entera de un módulo de ayudantes que nadie importaba, y tres decisiones de
 * producto que estaban escondidas en una variable que se tiraba. Una variable
 * sin usar no suele ser basura: suele ser el cabo de algo que no se terminó de
 * conectar.
 *
 * Por eso la regla queda en **error** y no en aviso con tope: lo que hay que
 * ver es la que entra nueva, el día que entra.
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
    plugins: {
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      /*
        Eran 179 y ahora son cero. La mitad --setenta y uno-- eran `(fila: any)`
        en los mapeadores de los repositorios, y no hubo que escribir ni un tipo
        a mano: el `select` con `as const` hace que Supabase deduzca la forma del
        esquema generado, y de ahi sale con `Awaited<ReturnType<...>>`.
        Lo comprueba `npm run selects`.

        Los demas salieron uno a uno, y **destaparon defectos**: el selector de
        estado de una vivienda ofrecia `config-pendiente` con guion medio donde la
        base espera guion bajo --guardarlo fallaba--; dos pantallas pintaban la
        clave cruda del tipo de documento, asi que el guardia leia
        «cedula_ciudadania 1098765432»; el formulario de editar un residente leia
        `menorEdad`, que no existe en ningun tipo --el campo es `esMenor`--, asi
        que la casilla salia siempre desmarcada; y `Conversation` no declaraba el
        campo por el que se ordena la lista de chats.

        Tambien salieron dos falsas alarmas, descartadas verificando: el tipo de
        visita **si** se traduce a `huesped_temporal` antes de insertar, y el
        `zodResolver as any` era la friccion conocida entre los `.default()` de
        zod y react-hook-form, no un desfase de campos.
      */
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          /*
            Un argumento sin usar se marca con `_`: es lo que distingue «no me
            hace falta este parámetro» de «me olvidé de usarlo».
          */
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          // Un `...resto` que existe para quitar campos de un objeto no es una
          // variable olvidada.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
