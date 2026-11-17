import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, retirarEstancia, salir, servicio, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: la portería vuelve a registrar visitas, solo de amigos o familia y
 * de profesionales temporales (16/11/2026, pedido del cliente).
 *
 * El 02/11/2026 se le había quitado el alta entera (Para Claude 200). Se
 * reabre solo eso, y aquí se fija el límite:
 *
 *   · registra amigos sin documento si la regla del edificio está apagada, y
 *     con ella encendida la base lo rechaza sin documento;
 *   · el profesional temporal lleva documento siempre;
 *   · nunca un permanente ni una estancia de huésped;
 *   · nunca en otro edificio, ni apuntando a una vivienda de otro;
 *   · y una vecina sigue registrando como antes.
 *
 * Cada «no» lleva al lado su «sí» con la misma forma. Los casos que miden
 * quién puede INSERTAR van sin `returning` (`insert` sin `select`), para que
 * no intervenga la política de lectura (AGENTS.md, 07/10/2026).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U101 = "44444444-4444-4444-4444-444444444441";
const AJENO = "22222222-2222-2222-2222-222222222222";
const UNIDAD_AJENA = "22222222-2222-2222-2222-222222222301";
const GUARDIA = "guardia@veciyo.test";
const PROPIETARIO = "propietario@veciyo.test";
const MARCA = "[prueba] porteria registra";

let guardiaId = "";
const creadas = new Set<string>();

async function reglaDeAmigos(encendida: boolean) {
  const { error } = await servicio
    .from("condominio")
    .update({ documento_amigos_obligatorio: encendida })
    .eq("id", CONDOMINIO);
  if (error) throw new Error(`No se pudo cambiar la regla: ${error.message}`);
}

/** Lo que la pantalla del guardia manda para un amigo que está en la puerta. */
function amigoEnLaPuerta(nombre: string, documento?: string) {
  return crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U101,
    tipo: "amigos",
    estado: "ingresada",
    fechaDesde: enDias(0),
    fechaHasta: enDias(0),
    instruccionDocumento: "no_verificar",
    aviso: "notificar_y_anunciar",
    autorizadaPorNombre: "Marcela de la 301",
    anotacionesIngreso: `${MARCA} ${nombre}`,
    invitados: [{ nombre: `${MARCA} ${nombre}`, documentoNumero: documento }],
    vehiculos: [{ placa: "ABC123", tipo: "auto" }],
  });
}

/** Un alta de visita sin `returning`: mide solo la política de escritura. */
async function altaSinLeer(fila: Record<string, unknown>) {
  const etiqueta = `${MARCA} alta ${Math.random().toString(36).slice(2)}`;
  const { error } = await supabase.from("visita").insert({
    condominio_id: CONDOMINIO,
    unidad_id: U101,
    tipo: "amigos",
    estado: "ingresada",
    fecha_desde: enDias(0).split("/").reverse().join("-"),
    fecha_hasta: enDias(0).split("/").reverse().join("-"),
    anotaciones_ingreso: etiqueta,
    ...fila,
  });
  // Lo que haya entrado se apunta para borrarlo por id.
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", etiqueta);
  for (const v of data ?? []) creadas.add(v.id);
  return { error, entro: (data ?? []).length > 0 };
}

/** Las visitas de este recorrido que quedaran (p. ej. si `crearVisita` falló a medias). */
async function barrerLasMias() {
  for (const condominio of [CONDOMINIO, AJENO]) {
    const { data, error } = await servicio
      .from("visita")
      .select("id")
      .eq("condominio_id", condominio)
      .like("anotaciones_ingreso", `${MARCA}%`);
    if (error) throw new Error(error.message);
    for (const v of data ?? []) creadas.add(v.id);
  }
}

beforeAll(async () => {
  await reglaDeAmigos(false);
  guardiaId = await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  await reglaDeAmigos(false);
  await barrerLasMias();
  for (const id of creadas) {
    const { error } = await retirarEstancia(id);
    if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
  }
  const { data: quedan } = await servicio.from("visita").select("id").in("id", [...creadas]);
  expect(quedan ?? []).toHaveLength(0);
});

describe("la portería registra a un amigo o familiar", () => {
  it("sin documento, con la regla del edificio apagada", async () => {
    const id = await amigoEnLaPuerta("sin documento");
    creadas.add(id);

    const { data: visita } = await servicio
      .from("visita")
      .select("estado, registrada_por, autorizada_por_nombre, tipo")
      .eq("id", id)
      .single();
    // Nace dentro, con quién la registró por FK y quién la autorizó.
    expect(visita).toMatchObject({
      estado: "ingresada",
      registrada_por: guardiaId,
      autorizada_por_nombre: "Marcela de la 301",
      tipo: "amigos",
    });
    const { data: gente } = await servicio
      .from("invitado")
      .select("llego, documento_numero")
      .eq("visita_id", id);
    expect(gente).toEqual([{ llego: true, documento_numero: null }]);
    const { data: coches } = await servicio.from("vehiculo_visita").select("placa").eq("visita_id", id);
    expect(coches).toEqual([{ placa: "ABC123" }]);
  });

  it("con la regla encendida, sin documento la base lo rechaza y con él lo deja", async () => {
    await reglaDeAmigos(true);
    try {
      await expect(amigoEnLaPuerta("regla encendida sin doc")).rejects.toMatchObject({
        message: expect.stringContaining("pide el documento a amigos"),
      });
      // El control: la misma visita con documento entra.
      const id = await amigoEnLaPuerta("regla encendida con doc", "12345678");
      creadas.add(id);
      expect(id).toBeTruthy();
    } finally {
      await reglaDeAmigos(false);
    }
  });
});

describe("la portería registra a un profesional temporal", () => {
  const profesional = (documento?: string, nombre = "temporal") =>
    crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U101,
      tipo: "temporal",
      /*
        Como la pantalla (`entraAlRegistrar`): desde el 17/11/2026 nace
        dentro siempre. El edificio de pruebas verifica el documento de los
        profesionales, y aun así entra: el guardia lo copió con la persona
        delante y la base lo da por verificado.
      */
      estado: "ingresada",
      fechaDesde: enDias(0),
      fechaHasta: enDias(0),
      instruccionDocumento: "verificar",
      profesion: "Plomero",
      autorizadaPorNombre: "Marcela de la 301",
      anotacionesIngreso: `${MARCA} ${nombre}`,
      invitados: [{ nombre: `${MARCA} ${nombre}`, documentoNumero: documento }],
    });

  it("con documento, sí", async () => {
    const id = await profesional("87654321", "temporal con doc");
    creadas.add(id);
    const { data } = await servicio
      .from("visita")
      .select("estado, registrada_por, registrada_en_porteria, anunciada_por")
      .eq("id", id)
      .single();
    // Nace dentro, marcada por la base y ya anunciada (17/11/2026).
    expect(data).toEqual({
      estado: "ingresada",
      registrada_por: guardiaId,
      registrada_en_porteria: true,
      anunciada_por: guardiaId,
    });

    // Su documento cuenta como verificado, con quién lo verificó.
    const { data: persona } = await servicio
      .from("invitado")
      .select("llego, verificacion:verificacion_documento ( estado, verificado_por, coincidio_por )")
      .eq("visita_id", id)
      .single();
    expect(persona?.llego).toBe(true);
    expect(persona?.verificacion).toMatchObject({
      estado: "verificado",
      verificado_por: guardiaId,
      coincidio_por: "tecleado",
    });

    // Y a la vivienda le llega «Nueva visita», una vez.
    const { data: avisos } = await servicio
      .from("notificacion")
      .select("titulo, mensaje")
      .eq("entidad_id", id);
    expect(avisos?.length).toBeGreaterThan(0);
    expect(avisos?.every((a) => a.titulo === "Nueva visita")).toBe(true);
    expect(avisos?.[0]?.mensaje).toContain("ingresó al 101");
  });

  it("sin documento, no: al profesional se le pide siempre", async () => {
    await expect(profesional(undefined, "temporal sin doc")).rejects.toMatchObject({
      message: expect.stringContaining("documento del profesional"),
    });
  });
});

describe("lo que la portería no registra", () => {
  it("el control: un amigo de su edificio, con la misma forma, entra", async () => {
    const r = await altaSinLeer({});
    expect(r.error).toBeNull();
    expect(r.entro).toBe(true);
  });

  it("un profesional permanente", async () => {
    const r = await altaSinLeer({ tipo: "permanente", fecha_hasta: null });
    expect(r.error?.code).toBe("42501");
    expect(r.entro).toBe(false);
  });

  it("una estancia de huésped", async () => {
    // En la 102, que es de renta corta, y de una noche: lo único que la frena
    // es que la registre la portería.
    const r = await altaSinLeer({
      tipo: "huesped_temporal",
      estado: "programada",
      unidad_id: "44444444-4444-4444-4444-444444444443",
      fecha_desde: isoEnDias(330),
      fecha_hasta: isoEnDias(331),
    });
    expect(r.error?.code).toBe("42501");
    expect(r.entro).toBe(false);
  });

  it("una visita de otro edificio", async () => {
    const r = await altaSinLeer({ condominio_id: AJENO, unidad_id: UNIDAD_AJENA });
    expect(r.error?.code).toBe("42501");
    expect(r.entro).toBe(false);
  });

  it("ni la de su edificio apuntando a una vivienda de otro", async () => {
    const r = await altaSinLeer({ unidad_id: UNIDAD_AJENA });
    expect(r.error?.code).toBe("42501");
    expect(r.entro).toBe(false);
  });

  it("ni firmada en nombre de otra persona", async () => {
    const { data: otra } = await servicio
      .from("membresia_condominio")
      .select("usuario_id")
      .eq("condominio_id", CONDOMINIO)
      .eq("rol", "administrador")
      .limit(1)
      .single();
    const r = await altaSinLeer({ registrada_por: otra?.usuario_id });
    expect(otra?.usuario_id).toBeTruthy();
    expect(r.error?.code).toBe("42501");
    expect(r.entro).toBe(false);
  });
});

describe("una vecina", () => {
  it("sigue registrando a sus amigos como antes, y sin documento", async () => {
    await salir();
    await entrarComo(PROPIETARIO);
    try {
      const id = await crearVisita({
        condominioId: CONDOMINIO,
        unidadId: U101,
        tipo: "amigos",
        fechaDesde: enDias(3),
        fechaHasta: enDias(3),
        instruccionDocumento: "no_verificar",
        anotacionesIngreso: `${MARCA} de la vecina`,
        invitados: [{ nombre: `${MARCA} amiga de la vecina` }],
      });
      creadas.add(id);
      expect(id).toBeTruthy();
    } finally {
      await salir();
      await entrarComo(GUARDIA);
    }
  });
});
