import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, salir, servicio, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  aceptarTerminos,
  adultosDeLaEstancia,
  guardarAcompanante,
  guardarFicha,
  listarAcompanantes,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: ningún menor entra sin que alguien responda por él.
 *
 * Hasta el 03/10/2026 `es_menor` era **una casilla que marca quien teclea**, y
 * no existía forma de decir quién se hace cargo: buscando `parentesco`, `tutor`
 * o `acudiente` en todo el esquema salían cero resultados.
 *
 * Y la casilla no era inocente. A un menor no se le pide documento —no lo
 * tiene— así que marcarse como menor era **la puerta para entrar al edificio
 * sin identificarse**. Ahora, quien da su fecha de nacimiento no elige además
 * si es menor: lo calcula la base, contra el día en que empieza la estancia.
 *
 * La regla la puso el cliente el 02/10/2026: «Menores sin padre o madre siempre
 * pedir documentación del responsable pues!». Son dos cosas distintas —todo
 * menor necesita responsable; y si no es el padre ni la madre, además el papel—
 * y aquí se comprueban por separado.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] menores y responsables";

/** Nacido hace tantos años, en números redondos. */
function naceHace(anos: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anos);
  return d.toISOString().slice(0, 10);
}

async function rpc(nombre: string, argumentos: Record<string, unknown>) {
  return supabase.rpc(nombre as never, argumentos as never);
}

/**
 * Retira una visita y lo que la sujeta.
 *
 * `verificacion_antecedentes` apunta al invitado con RESTRICT y la dispara el
 * propio cierre, así que una reserva cerrada deja de poderse borrar. Ya está en
 * AGENTS.md y ya mordió dos veces.
 */
async function retirar(id: string) {
  const { data: invitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", id);

  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
    await servicio.from("autorizacion_menor").delete().in("invitado_id", ids);
    await servicio.from("invitacion").delete().in("invitado_id", ids);
  }

  const { error } = await servicio.from("visita").delete().eq("id", id);
  if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
}

/** Abre una reserva de huésped con su titular ya puesto, y devuelve el token. */
async function reservaConTitular(dias: number) {
  await entrarComo(ANFITRIONA);
  const visita = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(dias),
    fechaHasta: enDias(dias + 3),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  const { enlace } = await abrirPrecheckin(visita);
  const token = enlace.split("/access/")[1];
  await salir();

  await guardarFicha(
    token,
    {
      nombre: "Marcela",
      apellidos: "Sierra",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-55443322",
      correo: "marcela.menores@veciyo.test",
      fechaNacimiento: naceHace(38),
    },
    supabase as never,
  );
  await aceptarTerminos(token, supabase as never);

  return { visita, token };
}

describe("la fecha de nacimiento manda sobre la casilla", () => {
  let visita = "";
  let token = "";

  beforeAll(async () => {
    ({ visita, token } = await reservaConTitular(5));
  });

  afterAll(async () => {
    await retirar(visita);
    await salir();
  });

  it("quien nació hace diez años es menor aunque nadie lo marque", async () => {
    const id = await guardarAcompanante(
      token,
      { nombre: "Tomasito", apellidos: "Sierra", fechaNacimiento: naceHace(10) },
      supabase as never,
    );

    const { data } = await servicio
      .from("invitado")
      .select("es_menor")
      .eq("id", id)
      .single();
    expect(data!.es_menor).toBe(true);
  });

  it("y quien nació hace treinta NO es menor, aunque se marque", async () => {
    /*
      Este es el agujero que cierra la tanda. A un menor no se le pide
      documento, así que marcarse como menor era la forma de entrar sin
      identificarse. Con fecha de adulto, la base lo corrige **y entonces le
      exige el documento**, que es lo que hace que el intento no sirva de nada.
    */
    await expect(
      guardarAcompanante(
        token,
        { nombre: "Adulto Disfrazado", esMenor: true, fechaNacimiento: naceHace(30) },
        supabase as never,
      ),
    ).rejects.toThrow(/documento/i);
  });

  it("y la base lo corrige aunque se escriba directo en la tabla", async () => {
    /*
      Esta es la **segunda defensa**, y la primera version de este archivo no la
      probaba: todos los casos pasaban por `guardar_acompanante`, que calcula la
      edad por su cuenta antes de insertar. Al mutar el disparador a
      `return new`, las doce pruebas seguian verdes.

      `guardar_acompanante` no es el unico camino a esta tabla. La aplicacion
      del anfitrion escribe invitados por PostgREST, y cualquiera con sesion
      puede hacer lo mismo. Si la regla vive solo en la funcion, basta no
      llamarla.

      Se escribe con la clave de servicio --que se salta RLS pero **no** los
      disparadores-- justamente para entrar por donde la funcion no mira.
    */
    const { data: visitaId } = await servicio
      .from("invitado")
      .select("visita_id")
      .eq("nombre", "Tomasito")
      .limit(1)
      .single();

    const { data: metido, error } = await servicio
      .from("invitado")
      .insert({
        visita_id: visitaId!.visita_id,
        nombre: "Por La Puerta De Atras",
        orden: 90,
        fecha_nacimiento: naceHace(35),
        es_menor: true,
      })
      .select("id, es_menor")
      .single();

    expect(error).toBeNull();
    expect(metido!.es_menor).toBe(false);

    await servicio.from("invitado").delete().eq("id", metido!.id);
  });

  it("una fecha posterior a la llegada se rechaza", async () => {
    await expect(
      guardarAcompanante(
        token,
        /*
          `isoEnDias` y no `enDias`: el segundo devuelve `dd/MM/yyyy`, que es el
          formato de la pantalla, y Postgres lo acepta igual sin quejarse. La
          primera version de este caso pasaba una fecha futura y la funcion la
          guardaba tan tranquila --no porque la regla faltara, sino porque la
          prueba mandaba otra cosa de la que creia--.
        */
        { nombre: "Imposible", fechaNacimiento: isoEnDias(60) },
        supabase as never,
      ),
    ).rejects.toThrow(/posterior a la llegada/i);
  });
});

describe("quién puede responder por un menor", () => {
  let visita = "";
  let token = "";
  let menor = "";

  beforeAll(async () => {
    ({ visita, token } = await reservaConTitular(8));
    menor = await guardarAcompanante(
      token,
      { nombre: "Tomasito", apellidos: "Sierra", fechaNacimiento: naceHace(9) },
      supabase as never,
    );
  });

  afterAll(async () => {
    await retirar(visita);
    await salir();
  });

  it("el titular sale en la lista de adultos: es el caso normal", async () => {
    /*
      Una madre que viaja con su hijo. El titular no sale en la lista de
      acompañantes —a propósito— así que sin esta función la pantalla no podría
      ofrecerla a ella misma, que es quien va a estar el 90% de las veces.
    */
    const adultos = await adultosDeLaEstancia(token, supabase as never);

    expect(adultos.some((a) => a.es_titular)).toBe(true);
    expect(adultos.some((a) => a.id === menor)).toBe(false);
  });

  it("no puede ser alguien de otra reserva", async () => {
    const { data: ajeno } = await servicio
      .from("invitado")
      .select("id")
      .neq("visita_id", visita)
      .limit(1)
      .single();

    await expect(
      guardarAcompanante(
        token,
        {
          id: menor,
          nombre: "Tomasito",
          fechaNacimiento: naceHace(9),
          responsableId: ajeno!.id,
          parentesco: "madre",
        },
        supabase as never,
      ),
    ).rejects.toThrow(/misma reserva/i);
  });

  it("ni otro menor", async () => {
    const otroNino = await guardarAcompanante(
      token,
      { nombre: "Hermanita", apellidos: "Sierra", fechaNacimiento: naceHace(6) },
      supabase as never,
    );

    await expect(
      guardarAcompanante(
        token,
        {
          id: menor,
          nombre: "Tomasito",
          fechaNacimiento: naceHace(9),
          responsableId: otroNino,
          parentesco: "otro",
        },
        supabase as never,
      ),
    ).rejects.toThrow(/menor no puede responder/i);

    await servicio.from("invitado").delete().eq("id", otroNino);
  });

  it("y un adulto no lleva responsable: eso se dice, no se ignora", async () => {
    const adultos = await adultosDeLaEstancia(token, supabase as never);
    const titular = adultos.find((a) => a.es_titular)!;

    await expect(
      guardarAcompanante(
        token,
        {
          nombre: "Pedro Mayor",
          documento: "[prueba]-77665544",
          tipoDocumento: "cedula_ciudadania",
          fechaNacimiento: naceHace(40),
          responsableId: titular.id,
          parentesco: "padre",
        },
        supabase as never,
      ),
    ).rejects.toThrow(/figura como adulto/i);
  });
});

describe("cerrar el preregistro con un menor dentro", () => {
  let visita = "";
  let token = "";
  let menor = "";
  let titularId = "";

  beforeAll(async () => {
    ({ visita, token } = await reservaConTitular(11));
    menor = await guardarAcompanante(
      token,
      { nombre: "Tomasito", apellidos: "Sierra", fechaNacimiento: naceHace(9) },
      supabase as never,
    );
    const adultos = await adultosDeLaEstancia(token, supabase as never);
    titularId = adultos.find((a) => a.es_titular)!.id;
  });

  afterAll(async () => {
    await retirar(visita);
    await salir();
  });

  it("no cierra mientras nadie responda por él, y lo dice por su nombre", async () => {
    /*
      Nombrarlo importa: con dos niños, un «falta alguien» obliga al titular a
      adivinar. Es lo mismo que ya se hizo con los términos.
    */
    const { error } = await rpc("cerrar_precheckin", { p_token: token });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Tomasito");
    expect(error!.message).toMatch(/quien responde/i);
  });

  it("con un tutor legal pide además el papel", async () => {
    await guardarAcompanante(
      token,
      {
        id: menor,
        nombre: "Tomasito",
        apellidos: "Sierra",
        fechaNacimiento: naceHace(9),
        responsableId: titularId,
        parentesco: "tutor_legal",
      },
      supabase as never,
    );

    const { error } = await rpc("cerrar_precheckin", { p_token: token });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Tomasito");
    expect(error!.message).toMatch(/autorizacion firmada/i);
  });

  it("la lista le dice al titular qué le falta al niño", async () => {
    const lista = await listarAcompanantes(token, supabase as never);
    const nino = lista.find((a) => a.id === menor)!;

    expect(nino.es_menor).toBe(true);
    expect(nino.responsable_id).toBe(titularId);
    expect(nino.parentesco).toBe("tutor_legal");
    expect(nino.tiene_autorizacion).toBe(false);
  });

  it("con el papel subido, cierra", async () => {
    const { error: errorPapel } = await servicio
      .from("autorizacion_menor")
      .insert({
        invitado_id: menor,
        archivo_path: `${visita}/autorizacion-${menor}.jpg`,
        responsable_id: titularId,
        parentesco: "tutor_legal",
      });
    expect(errorPapel).toBeNull();

    const { data, error } = await rpc("cerrar_precheckin", { p_token: token });
    expect(error).toBeNull();
    expect(data as unknown as string).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("si es su madre, no hace falta ningún papel", () => {
  let visita = "";
  let token = "";

  afterAll(async () => {
    await retirar(visita);
    await salir();
  });

  it("cierra sin más", async () => {
    /*
      Padre y madre no acreditan su vínculo con un permiso de viaje: o se es o
      no se es. Pedirlo convertiría el caso más común —una familia— en el más
      difícil, que es justo lo contrario de lo que el cliente pidió.
    */
    ({ visita, token } = await reservaConTitular(15));

    const adultos = await adultosDeLaEstancia(token, supabase as never);
    const madre = adultos.find((a) => a.es_titular)!;

    await guardarAcompanante(
      token,
      {
        nombre: "Tomasito",
        apellidos: "Sierra",
        fechaNacimiento: naceHace(7),
        responsableId: madre.id,
        parentesco: "madre",
      },
      supabase as never,
    );

    const { error } = await rpc("cerrar_precheckin", { p_token: token });
    expect(error).toBeNull();
  });
});
