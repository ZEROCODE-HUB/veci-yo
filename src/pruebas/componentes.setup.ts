import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Lo que necesita jsdom para que un componente de esta app se monte.
 *
 * Se añade solo lo que haga falta, cuando haga falta: un archivo de arranque
 * lleno de dobles «por si acaso» esconde justo lo que se quiere comprobar.
 */

/*
  El runtime nativo de Expo, lo minimo para que sus modulos **se importen**.

  `expo-modules-core` lee `globalThis.expo.EventEmitter` al cargarse, asi que
  cualquier `expo-clipboard`, `expo-image-picker` o similar que entre por un
  barril revienta antes de montar nada. Doblar uno por uno seria una lista
  interminable y ademas escondería el dia que uno de verdad haga falta.

  Solo cubre la importacion. Si una prueba llegara a **usar** el portapapeles,
  fallaria ahi --que es lo correcto: esa prueba tendria que decir que espera
  del portapapeles, no heredarlo de aqui--.
*/
(globalThis as Record<string, unknown>).expo = {
  EventEmitter: class {
    addListener() {
      return { remove() {} };
    }
    removeAllListeners() {}
    emit() {}
  },
  /*
    Cada modulo nativo que alguien pida existe y no hace nada. Sin esto,
    `expo-clipboard` tira «Cannot find native module» **al importarse**, y con
    ello se cae cualquier pantalla que lo arrastre por un barril.
  */
  modules: new Proxy({} as Record<string, unknown>, {
    get: () => ({}),
    has: () => true,
  }),
};

// Entre pruebas no se hereda el DOM de la anterior.
afterEach(cleanup);

/*
  `@expo/vector-icons` no resuelve sus propios modulos internos en ESM
  --`Cannot find module .../build/createIconSet`-- y no hay nada que probar en
  el: los iconos son decoracion, y las pruebas de aqui buscan textos y roles.
  Si alguna vez un icono lleva informacion que no esta en ningun texto, eso es
  un defecto de accesibilidad y se arregla en el componente, no aqui.
*/
vi.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
  MaterialCommunityIcons: () => null,
  FontAwesome: () => null,
  Feather: () => null,
}));

/*
  `react-native-reanimated` no se puede importar aqui: su `index.js` hace un
  import de directorio que ESM no resuelve.

  El doble es deliberadamente **transparente**: `createAnimatedComponent`
  devuelve el mismo componente, y los valores compartidos y los estilos
  animados devuelven objetos planos. Asi el arbol se pinta igual que en la app
  --con sus textos, sus roles y sus `onPress`-- y lo unico que se pierde es la
  interpolacion, que no es lo que estas pruebas comprueban.

  Es ademas la leccion del hallazgo 4 de `NAVEGADOR.md`: bajo Reanimated,
  `getComputedStyle` miente. Comprobar animaciones aqui daria falsos de los
  dos signos.
*/
vi.mock("react-native-reanimated", () => {
  const valorCompartido = (inicial: unknown) => ({ value: inicial });
  const sinEstilo = () => ({});
  const { View, Text, ScrollView } = require("react-native-web");

  const Animated = {
    createAnimatedComponent: (componente: unknown) => componente,
    View,
    Text,
    ScrollView,
  };

  return {
    default: Animated,
    ...Animated,
    useSharedValue: valorCompartido,
    useAnimatedStyle: sinEstilo,
    withTiming: (valor: unknown) => valor,
    withSpring: (valor: unknown) => valor,
    withDelay: (_: unknown, valor: unknown) => valor,
    /*
      `Easing.out(Easing.cubic)` y compañia: cualquier curva devuelve otra
      funcion. Enumerarlas seria una lista que se queda corta a la primera.
    */
    Easing: new Proxy(
      {},
      { get: () => (valor: unknown) => valor ?? ((t: number) => t) },
    ),
    FadeIn: {},
    FadeOut: {},
  };
});

/*
  `expo-blur` pide el runtime nativo de Expo al importarse --`EventEmitter` de
  `expo-modules-core`-- que en jsdom no existe. Es un desenfoque: se dobla por
  un contenedor que **sigue pintando sus hijos**, para que lo que hay dentro
  del velo se pueda buscar igual.
*/
vi.mock("expo-blur", () => {
  const { View } = require("react-native-web");
  return { BlurView: View };
});

/*
  `@react-navigation/native` hace imports de directorio --`./useBackButton`--
  que Node en ESM no resuelve, y entra en cualquier pantalla que use
  `ScreenLayout`.

  El doble es lo minimo para montar: navegar no es lo que comprueba esta
  suite. Una prueba que **si** quiera comprobar a donde se navega tiene que
  doblarlo ella con su propio espia, y asi se lee en la propia prueba que eso
  es lo que espera.
*/
vi.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: () => {},
    goBack: () => {},
    setOptions: () => {},
    addListener: () => () => {},
  }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
  useFocusEffect: () => {},
  NavigationContainer: ({ children }: { children?: unknown }) => children,
}));

/*
  `react-native-safe-area-context` trae tipos de Flow que Node no sabe leer
  --«Unexpected token 'typeof'»-- y entra por `ScreenLayout`, o sea por casi
  todas las pantallas.

  Los margenes de la muesca del telefono no cambian ningun texto ni ninguna
  regla: el doble deja pasar a los hijos y devuelve cero por los cuatro
  lados.
*/
vi.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native-web");
  const sinMargenes = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
    SafeAreaInsetsContext: { Consumer: View, Provider: View },
    useSafeAreaInsets: () => sinMargenes,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: sinMargenes },
  };
});

/*
  Dos widgets nativos que se distribuyen en Flow o que piden el puente de
  React Native: el selector de fecha y el de opciones. Ninguno se puede
  parsear aqui --«Flow is not supported»-- y los dos entran por los filtros de
  las pantallas.

  Se doblan por nada. Una prueba que necesite elegir una fecha con el
  calendario nativo no puede escribirse en esta suite: eso es un recorrido de
  navegador.
*/
vi.mock("@react-native-community/datetimepicker", () => ({ default: () => null }));
vi.mock("@react-native-picker/picker", () => {
  const { View } = require("react-native-web");
  const Picker = (props: { children?: unknown }) => props.children ?? null;
  Picker.Item = View;
  return { Picker, default: Picker };
});
