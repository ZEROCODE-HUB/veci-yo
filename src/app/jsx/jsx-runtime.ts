/**
 * La transformación de JSX de NativeWind, con el tope de letra encima.
 *
 * Metro manda aquí `react-native-css-interop/jsx-runtime` (lo dice
 * `metro.config.js`), así que cada `<Text>` de la app --y de React Native--
 * pasa por `conTopeDeLetra` y después por NativeWind, igual que antes.
 */
import * as base from "react-native-css-interop/jsx-runtime";
import { conTopeDeLetra, esTextoDeReactNative } from "../topeDeLetra";

export { Fragment, createElement } from "react-native-css-interop/jsx-runtime";
export const jsx = conTopeDeLetra(base.jsx, esTextoDeReactNative);
export const jsxs = conTopeDeLetra(base.jsxs, esTextoDeReactNative);
export const jsxDEV = conTopeDeLetra(base.jsxDEV, esTextoDeReactNative);
export const createInteropElement = conTopeDeLetra(base.createInteropElement, esTextoDeReactNative);
