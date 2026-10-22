import { describe, expect, it } from "vitest";
import { estaRegistrado, notificacionIdDe } from "./avisosPush.logica";
/*
  El módulo que de verdad corre en la función `enviar-push`, no una copia.
  Mismo patrón que Tus Datos, la TRA y el calendario.
*/
import { armarPush, leerRespuestaOneSignal } from "../../../supabase/functions/_compartido/onesignal";

describe("cuándo un celular cuenta como registrado", () => {
  it("con el id definitivo de OneSignal, sí", () => {
    expect(estaRegistrado("2f7a1c3e-8b6d-4e0f-9a21-5c3d7e9f1b20")).toBe(true);
  });

  it("con el provisional `local-`, no: con ese no llega nada", () => {
    expect(estaRegistrado("local-2f7a1c3e")).toBe(false);
  });

  it("sin id, no", () => {
    expect(estaRegistrado(null)).toBe(false);
    expect(estaRegistrado(undefined)).toBe(false);
    expect(estaRegistrado("")).toBe(false);
  });
});

describe("el aviso que viaja dentro del push", () => {
  it("se lee el id que puso enviar-push", () => {
    expect(notificacionIdDe({ notificacionId: "abc", tipo: "visita_ingreso" })).toBe("abc");
  });

  it("un push sin id (mandado a mano desde OneSignal) no se confirma", () => {
    expect(notificacionIdDe({})).toBeNull();
    expect(notificacionIdDe(null)).toBeNull();
    expect(notificacionIdDe({ notificacionId: 7 })).toBeNull();
    expect(notificacionIdDe({ notificacionId: "" })).toBeNull();
  });

  it("lo que arma la función se puede leer en la app: las dos mitades encajan", () => {
    const push = armarPush(
      {
        id: "n-1",
        usuarioId: "u-1",
        tipo: "correspondencia_recibida",
        titulo: "Llegó un paquete",
        mensaje: "Está en portería",
        entidadTipo: "correspondencia",
        entidadId: "c-1",
      },
      "app-1",
    );
    expect(notificacionIdDe(push.data)).toBe("n-1");
  });
});

describe("el push que se le pide a OneSignal", () => {
  const push = armarPush(
    {
      id: "n-1",
      usuarioId: "u-1",
      tipo: "visita_ingreso",
      titulo: "Entró tu visita",
      mensaje: "Ana Pérez entró a las 10:30",
      entidadTipo: null,
      entidadId: null,
    },
    "app-1",
  );

  it("va solo a la cuenta del aviso, por su external_id", () => {
    expect(push.include_aliases).toEqual({ external_id: ["u-1"] });
    expect(push.target_channel).toBe("push");
    expect(push.app_id).toBe("app-1");
  });

  it("lleva el título y el texto del aviso, también en `en` (OneSignal lo exige)", () => {
    expect(push.headings).toEqual({ en: "Entró tu visita", es: "Entró tu visita" });
    expect(push.contents).toEqual({ en: "Ana Pérez entró a las 10:30", es: "Ana Pérez entró a las 10:30" });
  });
});

describe("lo que responde OneSignal", () => {
  it("con id, salió", () => {
    expect(leerRespuestaOneSignal(200, { id: "os-1" })).toEqual({ estado: "enviado", onesignalId: "os-1", detalle: null });
  });

  it("200 sin id porque la persona no tiene celular: «sin_dispositivo», no un error", () => {
    expect(leerRespuestaOneSignal(200, { id: "", errors: ["All included players are not subscribed"] }).estado).toBe(
      "sin_dispositivo",
    );
    expect(
      leerRespuestaOneSignal(200, { id: "", errors: { invalid_aliases: { external_id: ["u-1"] } } }).estado,
    ).toBe("sin_dispositivo");
  });

  it("200 sin id por otra cosa: error, con la respuesta", () => {
    const r = leerRespuestaOneSignal(200, { id: "", errors: ["Message Notifications must have English language content"] });
    expect(r.estado).toBe("error");
    expect(r.detalle).toMatch(/English language content/);
  });

  it("una clave mala (403) es un error que dice el código", () => {
    const r = leerRespuestaOneSignal(403, { errors: ["Access denied"] });
    expect(r.estado).toBe("error");
    expect(r.detalle).toMatch(/403/);
  });
});
