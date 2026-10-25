const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });

/*
  El tope de letra (auditoría de responsividad, 24/10/2026): la transformación
  de JSX de NativeWind pasa primero por `src/app/jsx`, que pone
  `maxFontSizeMultiplier` a cada `Text` y `TextInput`.

  El nombre que llega es `react-native-css-interop/jsx-runtime`, no
  `nativewind/...`: el plugin de Babel de NativeWind cambia la fuente del JSX
  a esa. Desde `src/app/jsx` se pide la misma, y esa vez sí se deja pasar.
*/
const RUNTIMES = {
  'react-native-css-interop/jsx-runtime': path.resolve(__dirname, 'src/app/jsx/jsx-runtime.ts'),
  'react-native-css-interop/jsx-dev-runtime': path.resolve(__dirname, 'src/app/jsx/jsx-dev-runtime.ts'),
};
const NUESTROS = new Set(Object.values(RUNTIMES));
const resolverAnterior = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, nombre, plataforma) => {
  if (RUNTIMES[nombre] && !NUESTROS.has(context.originModulePath)) {
    return { type: 'sourceFile', filePath: RUNTIMES[nombre] };
  }
  return (resolverAnterior ?? context.resolveRequest)(context, nombre, plataforma);
};

module.exports = config;
