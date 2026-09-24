import { describe, expect, it } from "vitest";
import { permisosDeComunicacion } from "./permisosComunicacion";

/**
 * La prueba que invierte la casilla.
 *
 * `AGENTS.md`: una columna que expresa un permiso necesita una prueba que la
 * invierta y compruebe que el comportamiento cambia; si no la tiene, está
 * decorativa por definición. Estas dos lo estaban, y el botón flotante de
 * comunicaciones se le ofrecía a un guardia con las dos apagadas.
 */
describe("el chat y las llamadas de la portería", () => {
  it("apagadas por defecto: un permiso se concede, no se supone", () => {
    const r = permisosDeComunicacion({ rolActivo: "guardia", permisos: {} });
    expect(r.puedeChatear).toBe(false);
    expect(r.puedeLlamar).toBe(false);
  });

  it("encendidas una a una, y por separado", () => {
    const soloChat = permisosDeComunicacion({
      rolActivo: "guardia",
      permisos: { chat: true },
    });
    expect(soloChat.puedeChatear).toBe(true);
    expect(soloChat.puedeLlamar).toBe(false);

    const soloLlamadas = permisosDeComunicacion({
      rolActivo: "guardia",
      permisos: { llamadas: true },
    });
    expect(soloLlamadas.puedeChatear).toBe(false);
    expect(soloLlamadas.puedeLlamar).toBe(true);
  });

  it("nada que no sea `true` habilita", () => {
    /*
      El JSON viene de la base y no está tipado: un `"si"` o un `1` guardados
      por una versión vieja de la pantalla no pueden conceder un permiso.
    */
    for (const valor of ["true", 1, "si", null, undefined, {}]) {
      const r = permisosDeComunicacion({
        rolActivo: "guardia",
        permisos: { chat: valor },
      });
      expect(r.puedeChatear).toBe(false);
    }
  });

  it("y no se le recorta a quien no es portería", () => {
    // Para un residente esto no depende de ningún permiso; recortárselo sería
    // inventar una regla que nadie pidió.
    for (const rol of ["propietario", "administrador", "huesped-temporal", null]) {
      const r = permisosDeComunicacion({ rolActivo: rol, permisos: {} });
      expect(r.puedeChatear).toBe(true);
      expect(r.puedeLlamar).toBe(true);
    }
  });
});
