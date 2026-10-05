import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  actualizarCondominio,
  obtenerCondominio,
} from "@/features/administrador/services/condominio.repo";
import {
  actualizarPorteria,
  crearPorteria,
} from "@/features/administrador/services/arquitectura.repo";
import { actualizarCoadministrador } from "@/features/administrador/services/coadministradores.repo";
import { crearReclamo } from "@/features/perfil/services/pqrs.repo";
import { registrarMenor } from "@/features/propietario/services/invitacionesUnidad.repo";

/**
 * Recorrido: el teléfono sabe de qué país es.
 *
 * Lo que quedaba de la tanda 3. `CampoTelefono` se escribió el 03/10/2026 --un
 * campo compuesto con selector de país, buscador y los prefijos de veintisiete
 * países-- y **se enchufó en una sola pantalla**. Las otras siguieron con un
 * campo de texto pelado.
 *
 * Y debajo había algo peor y enumerable: **nueve columnas de país que existen
 * y nadie escribía**. Solo `perfil.codigo_pais` tenía quien la llenara; las
 * demás en null, y el teléfono de al lado guardado como texto libre --«+57 601
 * 7561234», con el prefijo dentro-- que es justo lo que no se puede volver a
 * separar.
 *
 * Importa porque el cliente quiere avisar por WhatsApp: un «3001234567» sin
 * país no se marca desde fuera ni se manda a ninguna parte.
 *
 * Esta prueba va **columna por columna**: no comprueba que la pantalla pinte un
 * selector --eso es presentación-- sino que el país **llega a la base**. Es la
 * diferencia entre «se ve» y «se guarda», que en este proyecto ya costó el
 * número de lavadora.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const SOFIA = "vecino@veciyo.test";
const U102 = "44444444-4444-4444-4444-444444444443";
/** Una cuenta sin ningún rol en ningún edificio: ver `coadminCreado`. */
const SIN_ROL = "invitado.prueba@veciyo.test";

const MARCA = "[prueba] pais del telefono";

let adminId = "";
let porteriaCreada = "";
let menorCreado = "";
let reclamoCreado = "";
/** Lo que tenía el condominio antes, para devolverlo. */
let condominioComoEstaba: Record<string, unknown> | null = null;
/**
 * El coadministrador que esta prueba se trae.
 *
 * No había ninguno activo en los datos, y un caso que depende de que exista
 * uno «si lo hay» no prueba nada el día que no lo hay --es la trampa del caso
 * negativo sin datos, por el otro lado--. Así que se crea y se retira.
 *
 * Con `invitado.prueba@veciyo.test`, que **no tiene ningún rol en ningún
 * edificio**: darle uno a una cuenta que ya tiene otro --Renata administra el
 * segundo condominio-- le daría visibilidad cruzada mientras esta prueba corre,
 * y `aislamiento-entre-condominios` corre en paralelo comprobando justo eso.
 */
let coadminCreado = "";

beforeAll(async () => {
  adminId = await entrarComo(ADMIN);

  /*
    La fila cruda, no lo que devuelve el repositorio: así la restauración sigue
    siendo correcta aunque el repositorio esté roto a propósito mientras se
    comprueba que esta prueba detecta algo.
  */
  const { data: condo } = await servicio
    .from("condominio")
    .select("nombre, direccion, ciudad, pais, identificacion_fiscal, telefono, codigo_pais, email")
    .eq("id", CONDOMINIO)
    .single();
  condominioComoEstaba = condo as Record<string, unknown>;

  /*
    El id se saca abriendo su sesión y no de `auth.users`: PostgREST no expone
    el esquema `auth`, así que `servicio.schema("auth")` devuelve null y el
    `beforeAll` muere con un «Cannot read properties of null». Y tampoco se
    escribe el uuid a mano: el día que las cuentas de prueba se vuelvan a
    sembrar, el número cambia y el fallo aparece lejos de aquí.
  */
  await salir();
  const sinRol = await entrarComo(SIN_ROL);
  await salir();
  await entrarComo(ADMIN);

  const { data: coadmin, error } = await servicio
    .from("membresia_condominio")
    .insert({
      condominio_id: CONDOMINIO,
      usuario_id: sinRol,
      rol: "coadministrador",
      nombre: `${MARCA} coadmin`,
      activo: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear el coadministrador: ${error.message}`);
  coadminCreado = coadmin!.id;
});

afterAll(async () => {
  await salir();

  if (condominioComoEstaba) {
    const { error } = await servicio
      .from("condominio")
      .update(condominioComoEstaba)
      .eq("id", CONDOMINIO);
    expect(error).toBeNull();
  }
  if (coadminCreado) {
    const { error } = await servicio
      .from("membresia_condominio")
      .delete()
      .eq("id", coadminCreado);
    expect(error).toBeNull();
  }
  if (porteriaCreada) {
    const { error } = await servicio.from("porteria").delete().eq("id", porteriaCreada);
    expect(error).toBeNull();
  }
  if (menorCreado) {
    await servicio.from("membresia_unidad").delete().eq("id", menorCreado);
  }
  if (reclamoCreado) {
    await servicio.from("reclamo").delete().eq("id", reclamoCreado);
  }
});

describe("el país del teléfono llega a la base", () => {
  it("el del edificio", async () => {
    const antes = await obtenerCondominio(CONDOMINIO);
    expect(antes).toBeTruthy();

    await actualizarCondominio(CONDOMINIO, {
      ...antes!.valores,
      telefono: "6017561234",
      codigoPais: "CO",
    });

    const { data } = await servicio
      .from("condominio")
      .select("telefono, codigo_pais")
      .eq("id", CONDOMINIO)
      .single();

    expect(data!.telefono).toBe("6017561234");
    expect(data!.codigo_pais).toBe("CO");
  });

  it("y la pantalla lo vuelve a leer", async () => {
    /*
      El control que hace que lo de arriba signifique algo: comprobar que se
      escribe no es comprobar que se ve. Ya pasó con el número de lavadora, que
      se guardaba bien y no aparecía en ninguna de las cuatro pantallas.
    */
    const leido = await obtenerCondominio(CONDOMINIO);
    expect(leido!.valores.codigoPais).toBe("CO");
    expect(leido!.valores.telefono).toBe("6017561234");
  });

  it("el de una portería, al crearla y al cambiarla", async () => {
    await crearPorteria(CONDOMINIO, {
      nombre: `${MARCA} garita`,
      tipo: "entrada_principal",
      telefono: "6017560000",
      codigoPais: "CO",
    });

    const { data: creada } = await servicio
      .from("porteria")
      .select("id, telefono, codigo_pais")
      .eq("nombre", `${MARCA} garita`)
      .single();
    porteriaCreada = creada!.id;

    expect(creada!.telefono).toBe("6017560000");
    expect(creada!.codigo_pais).toBe("CO");

    /*
      Y al cambiarla. Esto importa aparte porque `actualizarPorteria` hacía
      `update(datos)` con el objeto del formulario tal cual, y ese atajo exige
      que cada campo se llame igual que su columna: `codigoPais` no se llama
      `codigo_pais`, y un campo que no coincide **se ignora en silencio**.
    */
    await actualizarPorteria(porteriaCreada, { codigoPais: "PE", telefono: "12345678" });

    const { data: cambiada } = await servicio
      .from("porteria")
      .select("telefono, codigo_pais")
      .eq("id", porteriaCreada)
      .single();
    expect(cambiada!.codigo_pais).toBe("PE");
    expect(cambiada!.telefono).toBe("12345678");
  });

  it("el de un coadministrador", async () => {
    await actualizarCoadministrador(coadminCreado, {
      celular: "3105550101",
      codigoPais: "CO",
    });

    const { data } = await servicio
      .from("membresia_condominio")
      .select("telefono, codigo_pais")
      .eq("id", coadminCreado)
      .single();

    expect(data!.telefono).toBe("3105550101");
    expect(data!.codigo_pais).toBe("CO");
  });

  it("el de quien abre una PQRS", async () => {
    await salir();
    try {
      const sofiaId = await entrarComo(SOFIA);
      await crearReclamo({
        condominioId: CONDOMINIO,
        unidadId: U102,
        usuarioId: sofiaId,
        nombre: "Sofía",
        datos: {
          titulo: `${MARCA} — llámenme`,
          descripcion: "Para comprobar el país del teléfono.",
          area: "Condominio",
          tipo: "Reclamo",
          destinatario: "Administrador",
          correo: "vecino@veciyo.test",
          telefono: "3105550000",
          codigoPais: "CO",
          medioContacto: "Teléfono",
          modelo: "",
        },
      });
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const { data } = await servicio
      .from("reclamo")
      .select("id, telefono_contacto, codigo_pais_contacto")
      .eq("titulo", `${MARCA} — llámenme`)
      .single();
    reclamoCreado = data!.id;

    expect(data!.telefono_contacto).toBe("3105550000");
    expect(data!.codigo_pais_contacto).toBe("CO");
  });

  it("y el de un menor, que es de quien más falta hace", async () => {
    /*
      `registrar_menor` recibía `p_contacto_codigo` --el país del contacto de
      emergencia-- y **no el del teléfono del propio menor**: el del adulto que
      responde por él se guardaba y el del niño no.
    */
    await salir();
    try {
      await entrarComo(SOFIA);
      await registrarMenor({
        unidadId: U102,
        nombre: `${MARCA} Tomasito`,
        telefono: "3105559999",
        codigoPais: "CO",
      });
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const { data } = await servicio
      .from("membresia_unidad")
      .select("id, telefono, codigo_pais, es_menor, puede_acceder")
      .eq("nombre", `${MARCA} Tomasito`)
      .single();
    menorCreado = data!.id;

    expect(data!.telefono).toBe("3105559999");
    expect(data!.codigo_pais).toBe("CO");
    // Y sigue siendo un menor sin acceso: lo de arriba no cambió lo de antes.
    expect(data!.es_menor).toBe(true);
    expect(data!.puede_acceder).toBe(false);
  });
});
