/** Lo mismo que `jsx-runtime.ts`, para el modo de desarrollo. */
import * as base from "react-native-css-interop/jsx-dev-runtime";
import { conTopeDeLetra, esTextoDeReactNative } from "../topeDeLetra";

export { Fragment, createElement } from "react-native-css-interop/jsx-dev-runtime";
export const jsx = conTopeDeLetra(base.jsx, esTextoDeReactNative);
export const jsxs = conTopeDeLetra(base.jsxs, esTextoDeReactNative);
export const jsxDEV = conTopeDeLetra(base.jsxDEV, esTextoDeReactNative);
export const createInteropElement = conTopeDeLetra(base.createInteropElement, esTextoDeReactNative);
