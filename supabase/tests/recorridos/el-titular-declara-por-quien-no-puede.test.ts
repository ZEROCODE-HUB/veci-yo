import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita, obtenerVisitas } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  abrirEnlaceAcompanante,
  aceptarReglamento,
  aceptarTerminos,
  cerrarPrecheckin,
  declararIncapacidad,
  guardarAcompanante,
  guardarFicha,
  incapacidadesDelPrecheckin,
  retirarIncapacidad,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el titular declara por un acompañante que no puede registrarse.
 *
 * Decidido con el cliente el 09/10/2026. Cada adulto acepta lo suyo desde su
 * propio enlace, y eso dejaba sin salida a quien no puede: una persona que no
 * lee, alguien con una discapacidad, un adulto mayor sin telefono. El titular
 * dice por que, firma con su nombre y acepta por esa persona; el anfitrion lo
 * ve.
 *
 * Lo que se vigila es que esto no se convierta en el atajo para saltarse los
 * terminos de cualquiera: solo el titular, solo por otro adulto, con motivo y
 * con firma.
 */

const V = ventanaDe("el-titular-declara-por-quien-no-puede");

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] declaracion del titular";
const MOTIVO = "No sabe leer";

let visitaId = "";
let otraVisitaId = "";
let token = "";
let titularId = "";
let abuelaId = "";
let tokenAbuela = "";
let ajenoId = "";

async function retirar(id: string) {
  if (!id) return;
  const { data: invitados } = await servicio.from("invitado").select("id").eq("visita_id", id);
  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
    await servicio.from("invitacion").delete().in("invitado_id", ids);
  }
  const { error } = await servicio.from("visita").delete().eq("id", id);
  if (error) throw new Error(`No se pudo retirar ${id}: ${error.message}`);
}

const cerrar = () => cerrarPrecheckin(token, supabase as never, "https://veciyo.test");

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V),
    fechaHasta: enDias(V + 3),
    anotacionesIngreso: MARCA,
    huespedesPrevistos: 2,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  otraVisitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 10),
    fechaHasta: enDias(V + 12),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} ajeno` }],
  });
  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();

  titularId = await guardarFicha(
    token,
    {
      nombre: "Lucia",
      apellidos: "Prueba",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-10203040",
      correo: "lucia.declara@veciyo.test",
    },
    supabase as never,
  );
  await aceptarTerminos(token, supabase as never);
  await aceptarReglamento(token, supabase as never);

  abuelaId = await guardarAcompanante(
    token,
    {
      nombre: "Rosa",
      apellidos: "Mayor",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-50607080",
    },
    supabase as never,
  );
  tokenAbuela = await abrirEnlaceAcompanante(token, abuelaId, supabase as never);

  const { data } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", otraVisitaId)
    .limit(1)
    .single();
  ajenoId = data!.id;
});

afterAll(async () => {
  await retirar(visitaId);
  await retirar(otraVisitaId);
  await salir();
});

describe("quien no puede declarar", () => {
  it("antes de nada, no se cierra: a Rosa le faltan sus terminos", async () => {
    // El punto de partida: sin esto, «despues de declarar, cierra» no diria
    // que fue la declaracion lo que lo permitio.
    await expect(cerrar()).rejects.toThrow(/terminos: Rosa/i);
  });

  it("la propia acompañante, con su enlace, no", async () => {
    // Nadie se declara incapaz a si mismo para saltarse lo suyo.
    await expect(
      declararIncapacidad(
        tokenAbuela,
        { invitadoId: abuelaId, motivo: MOTIVO, nombreDeclarante: "Rosa Mayor" },
        supabase as never,
      ),
    ).rejects.toThrow(/no vale o ya vencio/i);
  });

  it("el titular por si mismo, tampoco", async () => {
    await expect(
      declararIncapacidad(
        token,
        { invitadoId: titularId, motivo: MOTIVO, nombreDeclarante: "Lucia Prueba" },
        supabase as never,
      ),
    ).rejects.toThrow(/no puede declarar por si mismo/i);
  });

  it("ni por alguien de otra reserva", async () => {
    await expect(
      declararIncapacidad(
        token,
        { invitadoId: ajenoId, motivo: MOTIVO, nombreDeclarante: "Lucia Prueba" },
        supabase as never,
      ),
    ).rejects.toThrow(/no esta en esta reserva/i);
  });

  it("sin decir por que, no", async () => {
    await expect(
      declararIncapacidad(
        token,
        { invitadoId: abuelaId, motivo: "   ", nombreDeclarante: "Lucia Prueba" },
        supabase as never,
      ),
    ).rejects.toThrow(/por que no puede/i);
  });

  it("y sin firmar, tampoco", async () => {
    await expect(
      declararIncapacidad(
        token,
        { invitadoId: abuelaId, motivo: MOTIVO, nombreDeclarante: "" },
        supabase as never,
      ),
    ).rejects.toThrow(/nombre completo/i);
  });
});

describe("el titular declara", () => {
  it("queda quien firmo, por quien y por que, redactado por la base", async () => {
    await declararIncapacidad(
      token,
      { invitadoId: abuelaId, motivo: MOTIVO, nombreDeclarante: "Lucia Prueba" },
      supabase as never,
    );

    const { data } = await servicio
      .from("invitado")
      .select(
        "terminos_aceptados, terminos_excepcion, terminos_aprobado_por, incapacidad_motivo, incapacidad_declaracion, incapacidad_declarado_por_invitado_id, incapacidad_declarado_en",
      )
      .eq("id", abuelaId)
      .single();

    expect(data!.terminos_excepcion).toBe(true);
    expect(data!.terminos_aceptados).toBe(true);
    // No la aprobo un usuario: la asume el titular, que es un invitado.
    expect(data!.terminos_aprobado_por).toBeNull();
    expect(data!.incapacidad_declarado_por_invitado_id).toBe(titularId);
    expect(data!.incapacidad_declarado_en).toBeTruthy();
    expect(data!.incapacidad_motivo).toBe(MOTIVO);
    expect(data!.incapacidad_declaracion).toContain("Lucia Prueba");
    expect(data!.incapacidad_declaracion).toContain("Rosa Mayor");
    expect(data!.incapacidad_declaracion).toContain(MOTIVO);
  });

  it("al volver al enlace, el titular lo ve", async () => {
    const declaradas = await incapacidadesDelPrecheckin(token, supabase as never);
    expect(declaradas[abuelaId]).toBe(MOTIVO);
    // Y con el enlace de la acompañante no se lee nada de esto.
    expect(await incapacidadesDelPrecheckin(tokenAbuela, supabase as never)).toEqual({});
  });

  it("y la anfitriona lee la declaracion en su aplicacion", async () => {
    await entrarComo(ANFITRIONA);
    const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U102] });
    await salir();

    const invitados = visitas.find((v) => v.uuid === visitaId)?.invitados ?? [];
    expect(invitados.find((i) => i.uuid === abuelaId)?.declaracionDeIncapacidad).toContain(
      MOTIVO,
    );
    // Solo en quien se declaro.
    expect(invitados.find((i) => i.uuid === titularId)?.declaracionDeIncapacidad).toBeUndefined();
  });
});

describe("y se puede deshacer", () => {
  it("retirada la declaracion, vuelve a faltar su aceptacion", async () => {
    await retirarIncapacidad(token, abuelaId, supabase as never);

    const { data } = await servicio
      .from("invitado")
      .select("terminos_aceptados, terminos_excepcion, incapacidad_declaracion")
      .eq("id", abuelaId)
      .single();
    expect(data).toEqual({
      terminos_aceptados: false,
      terminos_excepcion: false,
      incapacidad_declaracion: null,
    });

    await expect(cerrar()).rejects.toThrow(/terminos: Rosa/i);
  });

  it("declarada otra vez, el preregistro se cierra sin que Rosa haga nada", async () => {
    await declararIncapacidad(
      token,
      { invitadoId: abuelaId, motivo: MOTIVO, nombreDeclarante: "Lucia Prueba" },
      supabase as never,
    );
    await expect(cerrar()).resolves.toContain("/invitacion?token=");
  });

  it("cerrado, ya no se retira", async () => {
    await expect(retirarIncapacidad(token, abuelaId, supabase as never)).rejects.toThrow(
      /cerrado/i,
    );
  });
});
