import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Lo que necesita jsdom para que un componente de esta app se monte.
 *
 * Se añade solo lo que haga falta, cuando haga falta: un archivo de arranque
 * lleno de dobles «por si acaso» esconde justo lo que se quiere comprobar.
 */

// Entre pruebas no se hereda el DOM de la anterior.
afterEach(cleanup);
