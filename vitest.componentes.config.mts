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
/**
 * `require("@/assets/...png")` es como se cargan los recursos en React
 * Native, y hay decenas por el codigo. Metro los convierte en una referencia
 * a un modulo; aqui no hay Metro, y los alias de Vite **no se aplican a
 * `require`**, asi que el import revienta antes de montar nada.
 *
 * Se hace lo mismo que Metro, en una linea: la llamada se sustituye por un
 * valor. Ninguna prueba de esta suite comprueba imagenes ni tipografias; lo
 * que importa es que el componente se monte para poder leer sus textos.
 *
 * Va aqui y no cambiando la app: convertir esos `require` en `import` seria
 * tocar decenas de archivos para que funcionen las pruebas, que es justo al
 * reves de como tiene que ser.
 */
const recursosComoEnMetro = {
  name: "recursos-como-en-metro",
  transform(codigo: string) {
    if (!codigo.includes("require(")) return null;
    const sinRecursos = codigo.replace(
      /require\(\s*["'][^"']+\.(png|jpe?g|gif|webp|svg|ttf|otf|woff2?)["']\s*\)/g,
      '"recurso-de-prueba"',
    );
    return sinRecursos === codigo ? null : { code: sinRecursos, map: null };
  },
};

export default defineConfig({
  plugins: [recursosComoEnMetro],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    globals: false,
    setupFiles: ["./src/pruebas/componentes.setup.ts"],
    /*
      El cliente de Supabase se crea al importarse y exige estas dos, asi que
      cualquier pantalla que lo arrastre por un barril no llega ni a montarse.
      Son falsas a proposito: aqui no se llama a la red --las consultas van
      dobladas-- y si alguna prueba acabara pidiendo datos de verdad, fallaria
      contra un host que no existe, que es exactamente lo que deberia pasar.
    */
    env: {
      EXPO_PUBLIC_SUPABASE_URL: "http://supabase.invalido",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "clave-de-prueba",
    },
  },
  /*
    Lo que normalmente inyecta el bundler de React Native, que aqui no existe.
    Va en `define` y no en el arranque porque hay modulos que lo leen **al
    importarse**, antes de que corra una linea de `setupFiles`.

    `__DEV__` en false a proposito: en true, `expo/src/async-require/setup`
    intenta montar Fast Refresh --hay `window`, porque esto es jsdom-- y pide
    un modulo que no se puede resolver. Recargar en caliente no tiene sentido
    en una prueba.
  */
  define: {
    __DEV__: "false",
    "process.env.EXPO_OS": JSON.stringify("web"),
  },
  resolve: {
    /*
      Las extensiones `.web.*` primero, que es lo que hace Metro al empaquetar
      para navegador. Va junto con el alias de `react-native-svg` de mas abajo:
      el alias nombra su entrada web, y esto hace que **lo que esa entrada
      importa** --`./elements`, `./xml`-- resuelva tambien a la version web.
      Sin una de las dos piezas el archivo ni arranca: con el alias solo, un
      error de analisis; sin el alias, «Unexpected token 'typeof'» de las
      especificaciones de Fabric en TypeScript sin compilar.
    */
    extensions: [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
    alias: [
      /*
        Las imagenes: en la app las resuelve Metro y aqui no hay Metro. Se
        cambian por un modulo que devuelve una ruta, que es lo unico que los
        componentes hacen con ellas --pasarla a `<Image source>`--.
      */
      {
        // El patron cubre el especificador entero: un alias con expresion
        // regular sustituye **solo lo que casa**, asi que `/\.png$/` dejaria
        // la ruta pegada al reemplazo.
        find: /^.*\.(png|jpe?g|gif|webp|svg)$/,
        replacement: path.resolve(__dirname, "src/pruebas/imagen.ts"),
      },
      {
        find: /^expo-modules-core$/,
        replacement: path.resolve(__dirname, "src/pruebas/expo-modules-core.ts"),
      },
      {
        find: /^expo$/,
        replacement: path.resolve(__dirname, "src/pruebas/expo-runtime.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: /^react-native$/, replacement: "react-native-web" },
      /*
        `react-native-svg` apunta con `main` a su version **nativa**, que trae
        las especificaciones de Fabric en TypeScript sin compilar: el archivo
        ni arranca --«Unexpected token 'typeof'»--. Trae su propia version web
        compilada, que es la que Metro elige al empaquetar para navegador y la
        que de verdad corre en la aplicacion hoy; aqui hay que nombrarla.
      */
      {
        find: /^react-native-svg$/,
        replacement: path.resolve(
          __dirname,
          "node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js",
        ),
      },
    ],
  },
});
