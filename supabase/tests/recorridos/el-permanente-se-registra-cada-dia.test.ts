import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearVisita,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarHoraInvitado,
} from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: un profesional permanente entra y sale cada día.
 *
 * Decidido con el cliente el 13/10/2026. Hasta entonces la visita permanente
 * tenía una sola entrada y una sola salida: el primer día que la empleada
 * salía, la visita pasaba a «finalizada» y la portería ya no podía volver a
 * marcarle la entrada. Y no quedaba constancia de qué días había venido.
 *
 * Las visitas van **sin fecha**: cuentan desde el día en que se anotan, con el
 * reloj del edificio, así que la portería las ve hoy sin que la prueba tenga
 * que adivinar qué día es allí.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const GUARDIA = "guardia@veciyo.test";
const DUENO_205 = "propietario@veciyo.test";
const VECINA_102 = "vecino@veciyo.test";

const MARCA = "[prueba] permanente cada dia";
const TODOS = [0, 1, 2, 3, 4, 5, 6];

const creadas: string[] = [];
let permanenteId = "";
let empleada = "";
let amigosId = "";
let amigo = "";

async function estadoDe(id: string) {
  const { data, error } = await servicio
    .from("visita")
    .select("estado")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data.estado;
}

async function jornadasDe(visita: string) {
  const { data, error } = await servicio
    .from("jornada_visita")
    .select("id, ingreso_en, salida_en, fuera_de_dia, ingreso_por, salida_por")
    .eq("visita_id", visita)
    .order("ingreso_en");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function invitadoDe(visita: string) {
  const { data, error } = await servicio
    .from("invitado")
    .select("id, llego, ingreso_en, salida_en")
    .eq("visita_id", visita)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** El día de la semana que es hoy **en el edificio**, que es con el que cuenta la regla. */
async function diaDeHoyEnElEdificio(): Promise<number> {
  const { data: zona, error } = await supabase.rpc(
    "zona_horaria_del_condominio",
    { p_condominio_id: CONDOMINIO },
  );
  if (error) throw new Error(error.message);
  const nombre = new Intl.DateTimeFormat("en-US", {
    timeZone: zona as string,
    weekday: "short",
  }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nombre);
}

beforeAll(async () => {
  await entrarComo(DUENO_205);

  permanenteId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U205,
    tipo: "permanente",
    profesion: MARCA,
    diasTrabajo: TODOS,
    invitados: [{ nombre: `${MARCA} empleada` }],
  });
  creadas.push(permanenteId);
  empleada = (await invitadoDe(permanenteId)).id;

  // El control: una visita corriente, que sí termina al salir.
  amigosId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U205,
    tipo: "amigos",
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} amigo` }],
  });
  creadas.push(amigosId);
  amigo = (await invitadoDe(amigosId)).id;

  await salir();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  for (const id of creadas) {
    const { error } = await servicio.from("visita").delete().eq("id", id);
    if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);
  }
});

describe("los días en que viene", () => {
  it("se guardan al registrarlo y vuelven al leerlo", async () => {
    const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U205] });
    const visita = visitas.find((v) => v.uuid === permanenteId);
    expect(visita?.diasTrabajo).toEqual(TODOS);
    expect(visita?.jornadas).toEqual([]);
  });
});

describe("la portería marca su entrada y su salida", () => {
  it("al entrar queda una jornada abierta, con quién la marcó", async () => {
    await marcarLlegadaInvitado(empleada, true);

    const jornadas = await jornadasDe(permanenteId);
    expect(jornadas).toHaveLength(1);
    expect(jornadas[0].salida_en).toBeNull();
    expect(jornadas[0].fuera_de_dia).toBe(false);
    const { data: sesion } = await supabase.auth.getUser();
    expect(jornadas[0].ingreso_por).toBe(sesion.user!.id);

    expect(await estadoDe(permanenteId)).toBe("ingresada");
  });

  it("al salir se cierra la jornada y la visita NO termina: queda lista para mañana", async () => {
    await registrarHoraInvitado(empleada, "salida", "23:59");

    const jornadas = await jornadasDe(permanenteId);
    expect(jornadas).toHaveLength(1);
    expect(jornadas[0].salida_en).not.toBeNull();
    expect(jornadas[0].salida_por).not.toBeNull();

    // Lo que fallaba: pasaba a «finalizada» y no se podía volver a entrar.
    expect(await estadoDe(permanenteId)).toBe("programada");
    const persona = await invitadoDe(permanenteId);
    expect(persona.llego).toBe(false);
    expect(persona.ingreso_en).toBeNull();
    expect(persona.salida_en).toBeNull();
  });

  it("el control: una visita corriente sí termina al salir, y no deja jornadas", async () => {
    await marcarLlegadaInvitado(amigo, true);
    await registrarHoraInvitado(amigo, "salida", "23:59");

    expect(await estadoDe(amigosId)).toBe("finalizada");
    expect(await jornadasDe(amigosId)).toHaveLength(0);
  });

  it("vuelve a entrar y queda una segunda jornada", async () => {
    await marcarLlegadaInvitado(empleada, true);

    const jornadas = await jornadasDe(permanenteId);
    expect(jornadas).toHaveLength(2);
    expect(jornadas[1].salida_en).toBeNull();
    expect(await estadoDe(permanenteId)).toBe("ingresada");
  });

  it("desmarcar una llegada apuntada por error borra esa jornada, no las anteriores", async () => {
    await marcarLlegadaInvitado(empleada, false);

    const jornadas = await jornadasDe(permanenteId);
    expect(jornadas).toHaveLength(1);
    expect(jornadas[0].salida_en).not.toBeNull();
    expect(await estadoDe(permanenteId)).toBe("programada");
  });

  it("si viene un día que no es de los suyos entra igual, y queda anotado", async () => {
    const hoy = await diaDeHoyEnElEdificio();
    const { error } = await servicio
      .from("visita")
      .update({ dias_trabajo: TODOS.filter((dia) => dia !== hoy) })
      .eq("id", permanenteId);
    if (error) throw new Error(error.message);

    await marcarLlegadaInvitado(empleada, true);

    const jornadas = await jornadasDe(permanenteId);
    expect(jornadas).toHaveLength(2);
    expect(jornadas[1].fuera_de_dia).toBe(true);
    // El control: la del día que sí le tocaba no cambió.
    expect(jornadas[0].fuera_de_dia).toBe(false);
  });

  it("la pantalla recibe la asistencia, la más reciente primero", async () => {
    const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U205] });
    const visita = visitas.find((v) => v.uuid === permanenteId);

    expect(visita?.jornadas).toHaveLength(2);
    expect(visita?.jornadas?.[0]).toMatchObject({ fueraDeDia: true });
    expect(visita?.jornadas?.[0].salida).toBeUndefined();
    expect(visita?.jornadas?.[1]).toMatchObject({ fueraDeDia: false });
    expect(visita?.jornadas?.[1].salida).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("la asistencia es constancia", () => {
  it("la ve quien ve la visita, y nadie más", async () => {
    await salir();
    await entrarComo(DUENO_205);
    const suyas = await supabase
      .from("jornada_visita")
      .select("id")
      .eq("visita_id", permanenteId);
    expect(suyas.data).toHaveLength(2);

    await salir();
    await entrarComo(VECINA_102);
    const ajenas = await supabase
      .from("jornada_visita")
      .select("id")
      .eq("visita_id", permanenteId);
    expect(ajenas.data).toHaveLength(0);
  });

  it("nadie la escribe a mano, ni el dueño de la vivienda", async () => {
    await salir();
    await entrarComo(DUENO_205);

    const alta = await supabase.from("jornada_visita").insert({
      visita_id: permanenteId,
      invitado_id: empleada,
      fecha: "2026-01-01",
      ingreso_en: new Date().toISOString(),
    });
    expect(alta.error?.code).toBe("42501");

    // Borrar no da error --no hay política-- pero no borra nada.
    await supabase.from("jornada_visita").delete().eq("visita_id", permanenteId);
    expect(await jornadasDe(permanenteId)).toHaveLength(2);
  });
});
