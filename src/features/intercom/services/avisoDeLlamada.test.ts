import { describe, expect, it } from "vitest";
import {
  armarPushDeLlamada,
  armarVoip,
  deQuienLlama,
} from "../../../../supabase/functions/_compartido/llamada";

/**
 * El aviso al celular de una llamada por la app (28/10/2026). Lo que importa
 * es lo que lee el código nativo de Android (`LlamadaEntranteExtension`):
 * `tipo`, `llamadaId`, `deQuien` y `segundos`. Si cambia un nombre, el APK deja
 * de reconocer la llamada y la enseña como un aviso cualquiera.
 */
describe("quién llama", () => {
  it("la administración, la portería o la vivienda", () => {
    expect(deQuienLlama("administracion", null)).toBe("Administración");
    expect(deQuienLlama("porteria", null)).toBe("Portería");
    expect(deQuienLlama("vivienda", "102")).toBe("Vivienda 102");
  });

  it("las llamadas de antes, sin origen, se deducen de la vivienda", () => {
    expect(deQuienLlama(null, "102")).toBe("Vivienda 102");
    expect(deQuienLlama(null, null)).toBe("Portería");
  });
});

describe("el push de la llamada", () => {
  const base = { appId: "app", llamadaId: "l1", deQuien: "Administración", para: ["u1", "u2"], segundos: 60 };

  it("al sonar: lo que lee el APK, a quiénes, con prioridad y sin llegar tarde", () => {
    const push = armarPushDeLlamada({ ...base, evento: "sonando" });
    expect(push.data).toEqual({ tipo: "llamada_entrante", llamadaId: "l1", deQuien: "Administración", segundos: 60 });
    expect(push.include_aliases.external_id).toEqual(["u1", "u2"]);
    expect(push.priority).toBe(10);
    expect(push.ttl).toBe(60);
    expect(push.headings.es).toBe("Administración");
  });

  it("al dejar de sonar: el mismo collapse_id, para que sustituya al primero", () => {
    const sonando = armarPushDeLlamada({ ...base, evento: "sonando" });
    const fin = armarPushDeLlamada({ ...base, evento: "fin" });
    expect(fin.data.tipo).toBe("llamada_fin");
    expect(fin.collapse_id).toBe(sonando.collapse_id);
  });

  it("el VoIP del iPhone lleva lo que CallKit necesita", () => {
    expect(armarVoip({ llamadaId: "l1", deQuien: "Portería", segundos: 60 })).toEqual({
      aps: {},
      tipo: "llamada_entrante",
      llamadaId: "l1",
      deQuien: "Portería",
      segundos: 60,
    });
  });
});
