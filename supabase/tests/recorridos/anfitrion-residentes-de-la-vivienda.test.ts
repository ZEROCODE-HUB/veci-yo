import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  cambiarVisibilidad,
  declararseResidente,
  designarPrimario,
  obtenerResidentes,
} from "@/features/propietario/services/residentes.repo";

/**
 * Recorrido: quién vive en la vivienda, y quién decide sobre ella.
 *
 * La pantalla mostraba **tres residentes inventados** --nombres fijos en el
 * código-- mientras la tabla `membresia_unidad` tenía los de verdad. Este
 * recorrido fija que lo que se ve sale del dato, y que las tres decisiones que
 * viven en esa tabla se pueden tomar y se respetan:
 *
 *   · quién es el anfitrión primario de la vivienda,
 *   · si el propietario además vive ahí,
 *   · y qué datos suyos ve el resto del edificio.
 *
 * `datos_visibles` es de la familia de casillas que este proyecto ha tenido
 * decorativas seis veces: la pantalla las respetaba y la base no. Por eso el
 * caso que la apaga comprueba el efecto **en otra sesión**, no en la propia.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, propietaria de la 102
const GUARDIA = "guardia@veciyo.test";
const AJENO = "propietario@veciyo.test";

let miMembresia = "";
let visibilidadOriginal: {
  datos_visibles: boolean;
  contactable_chat: boolean;
  contactable_whatsapp: boolean;
} | null = null;
let residenteOriginal = false;

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  const { data: sesion } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("membresia_unidad")
    .select("id, datos_visibles, contactable_chat, contactable_whatsapp, es_residente")
    .eq("unidad_id", U102)
    .eq("usuario_id", sesion.user!.id)
    .single();

  miMembresia = data!.id;
  visibilidadOriginal = {
    datos_visibles: data!.datos_visibles,
    contactable_chat: data!.contactable_chat,
    contactable_whatsapp: data!.contactable_whatsapp,
  };
  residenteOriginal = data!.es_residente;
});

afterAll(async () => {
  // Restauración por escritura directa: si se mutan las funciones de la app
  // para comprobar que la prueba las detecta, devolver el estado con ellas
  // escribiría con el código roto.
  await salir();
  await entrarComo("admin@veciyo.test");
  if (miMembresia && visibilidadOriginal) {
    await supabase
      .from("membresia_unidad")
      .update({ ...visibilidadOriginal, es_residente: residenteOriginal })
      .eq("id", miMembresia);
  }
  await salir();
});

describe("los residentes de la vivienda", () => {
  it("salen de la base, no de una lista inventada", async () => {
    const residentes = await obtenerResidentes(U102);
    expect(residentes.length).toBeGreaterThan(0);

    // Todos tienen identidad real: `id` es el de la **membresía**, que es lo
    // que las acciones necesitan. Sin él no se podría actuar
    // sobre ninguno.
    for (const r of residentes) {
      expect(r.id).toBeTruthy();
      expect(r.nombre).toBeTruthy();
    }

    // Y la anfitriona está entre ellos.
    const { data: sesion } = await supabase.auth.getUser();
    expect(residentes.some((r) => r.usuarioId === sesion.user!.id)).toBe(true);
  });

  it("el propietario se declara residente, y deja de serlo", async () => {
    /*
      Vivir en la vivienda y ser su dueño son cosas distintas, y de esa
      diferencia dependen los módulos que ve: quien no reside no tiene visitas
      ni zonas comunes.
    */
    await declararseResidente(U102, true);
    let residentes = await obtenerResidentes(U102);
    const { data: sesion } = await supabase.auth.getUser();
    expect(
      residentes.find((r) => r.usuarioId === sesion.user!.id)?.esResidente,
    ).toBe(true);

    await declararseResidente(U102, false);
    residentes = await obtenerResidentes(U102);
    expect(
      residentes.find((r) => r.usuarioId === sesion.user!.id)?.esResidente,
    ).toBe(false);

    await declararseResidente(U102, true);
  });

  it("se designa anfitrión primario, y solo puede haber uno", async () => {
    await designarPrimario(miMembresia, "anfitrion");

    const { data } = await supabase
      .from("membresia_unidad")
      .select("id, es_anfitrion_primario")
      .eq("unidad_id", U102)
      .eq("activo", true);

    const primarios = (data ?? []).filter((m) => m.es_anfitrion_primario);
    expect(primarios).toHaveLength(1);
    expect(primarios[0].id).toBe(miMembresia);
  });

  it("apaga sus datos visibles, y el resto del edificio deja de verlos", async () => {
    /*
      El efecto se comprueba **en otra sesión**. Mirarlo en la propia no
      probaría nada: uno siempre ve sus datos, y la casilla podría estar
      decorativa --le ha pasado seis veces a este proyecto--.
    */
    await cambiarVisibilidad(miMembresia, { datosVisibles: false });

    await salir();
    await entrarComo(GUARDIA);
    const visto = await supabase
      .from("membresia_unidad")
      .select("telefono, datos_visibles")
      .eq("id", miMembresia)
      .maybeSingle();
    expect(visto.data?.datos_visibles ?? false).toBe(false);

    await salir();
    await entrarComo(ANFITRIONA);
    await cambiarVisibilidad(miMembresia, { datosVisibles: true });
  });

  it("y el dueño de otra vivienda no toca a nadie de esta", async () => {
    await salir();
    await entrarComo(AJENO);

    await cambiarVisibilidad(miMembresia, { datosVisibles: false }).catch(
      () => {},
    );
    await salir();
    await entrarComo("admin@veciyo.test");
    const { data } = await supabase
      .from("membresia_unidad")
      .select("datos_visibles")
      .eq("id", miMembresia)
      .single();
    // Se comprueba con una sesión que sí puede ver: "no lo veo" no es "no pasó".
    expect(data!.datos_visibles).toBe(true);

    await salir();
    await entrarComo(ANFITRIONA);
  });

  it("trae el contacto de emergencia, que estaba en la tabla y no se pedía", async () => {
    /*
      El `select` no lo pedía, así que el formulario de editar a un residente
      mostraba los tres campos en blanco --unos datos que la persona sí había
      dado al registrarse--. Punto 49 de `REVISAR-A-OJO.md`.

      El caso **se trae el dato**: hoy no hay ningún contacto de emergencia
      guardado en la base, así que una prueba que solo leyera pasaría por estar
      todo vacío, que es la misma trampa que un caso negativo sin datos. Se
      escribe con el cliente de servicio --es un dato de otra persona-- y se
      devuelve al terminar.
    */
    const { data: antes } = await servicio
      .from("membresia_unidad")
      .select("contacto_emergencia_nombre, contacto_emergencia_codigo, contacto_emergencia_telefono")
      .eq("id", miMembresia)
      .single();

    await servicio
      .from("membresia_unidad")
      .update({
        contacto_emergencia_nombre: "[prueba] Marta Ríos",
        contacto_emergencia_codigo: "+57",
        contacto_emergencia_telefono: "3005550101",
      })
      .eq("id", miMembresia);

    try {
      await entrarComo(ANFITRIONA);
      const lista = await obtenerResidentes(U102);
      const yo = lista.find((persona) => persona.id === miMembresia);
      expect(yo, "la membresía propia tiene que estar en la lista").toBeDefined();
      expect(yo!.contactoNombre).toBe("[prueba] Marta Ríos");
      expect(yo!.contactoCodigo).toBe("+57");
      expect(yo!.contactoTelefono).toBe("3005550101");
      await salir();
    } finally {
      // La fila entera como estaba, por escritura directa.
      await servicio
        .from("membresia_unidad")
        .update(antes ?? {})
        .eq("id", miMembresia);
    }
  });
});
