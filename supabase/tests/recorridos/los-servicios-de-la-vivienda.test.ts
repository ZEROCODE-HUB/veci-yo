import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  agregarServicioDeVivienda,
  borrarServicioDeVivienda,
  obtenerServiciosDeVivienda,
} from "@/features/propietario/services/serviciosDeVivienda.repo";

/**
 * Recorrido: los servicios que paga la vivienda.
 *
 * La luz, el agua, el internet. El KT lista «agregar servicio» entre lo que
 * hace el propietario y la pantalla estaba terminada desde el prototipo; lo
 * que faltaba era **dónde guardarlo**. Mientras tanto el alta llamaba a
 * `simularAgregarServicio`, que esperaba 180 ms y devolvía lo que le dieras:
 * el último servicio que fingía en todo el proyecto.
 *
 * Lo que de verdad hay que comprobar aquí no es que se guarde —eso lo hace
 * cualquier `insert`— sino **el límite**: quién lo ve y quién no.
 *
 * El cliente lo dudó —«¿la administración no carga esos datos?»— y la
 * respuesta es que no: los mete el propietario, y el número de cliente de la
 * luz y el del medidor son del hogar. Así que la administración **no los ve**,
 * y eso necesita su caso con un control positivo al lado: que no vea los
 * nuestros no prueba nada si resulta que no ve nada.
 *
 * ----------------------------------------------------------------------------
 * `servicio` y `supabase` no son lo mismo, y aquí se nota
 * ----------------------------------------------------------------------------
 * `servicio` lleva la **clave de servicio**: se salta RLS entera. Sirve para
 * mirar la fila cruda y para limpiar lo que ninguna sesión puede borrar, y
 * **no sirve para comprobar un límite**: con ella, la administración «ve» todo
 * siempre.
 *
 * La primera versión de los dos casos de abajo la usaba, y se pusieron rojos
 * --el `expect` decía que veía la fila-- que es la forma buena de equivocarse:
 * el error salió en la medición y no en el producto. Con `supabase`, que es
 * la sesión de verdad, miden lo que dicen medir.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test"; // propietaria de la 102
const ADMIN = "admin@veciyo.test";
const GUARDIA = "guardia@veciyo.test";

const MARCA = "[prueba] Luz del recorrido";

let creado = "";

beforeAll(async () => {
  // Una prueba que cuenta se trae su propio cero: una corrida anterior que
  // muriera a mitad deja el suyo y el recuento sale distinto.
  await servicio.from("servicio_de_vivienda").delete().like("nombre", "[prueba]%");
});

afterAll(async () => {
  await salir();
  const { error } = await servicio
    .from("servicio_de_vivienda")
    .delete()
    .like("nombre", "[prueba]%");
  expect(error).toBeNull();
});

describe("el propietario da de alta un servicio", () => {
  it("y llega entero a la base", async () => {
    await entrarComo(SOFIA);

    creado = await agregarServicioDeVivienda({
      unidadId: U102,
      nombre: MARCA,
      empresa: "Enel",
      numeroCliente: "C-99887",
      numeroMedidor: "M-12345",
      diaPrimerAviso: 10,
      diaSegundoAviso: 25,
      correoFactura: "facturas@veciyo.test",
      telefono: "6017561234",
      codigoPais: "CO",
    });
    expect(creado).toBeTruthy();

    const { data } = await servicio
      .from("servicio_de_vivienda")
      .select("*")
      .eq("id", creado)
      .single();

    expect(data!.nombre).toBe(MARCA);
    expect(data!.empresa).toBe("Enel");
    expect(data!.numero_cliente).toBe("C-99887");
    expect(data!.numero_medidor).toBe("M-12345");
    // El día del mes, no una fecha: decisión del cliente del 06/10/2026.
    expect(data!.dia_primer_aviso).toBe(10);
    expect(data!.dia_segundo_aviso).toBe(25);
    expect(data!.correo_factura).toBe("facturas@veciyo.test");
    expect(data!.telefono).toBe("6017561234");
    expect(data!.codigo_pais).toBe("CO");
  });

  it("y la pantalla lo vuelve a leer", async () => {
    /*
      Comprobar que se escribe no es comprobar que se ve. Ya pasó con el
      número de lavadora: se guardaba bien y no aparecía en ninguna de las
      cuatro pantallas que lo tenían que enseñar.
    */
    const lista = await obtenerServiciosDeVivienda(U102);
    const nuestro = lista.find((s) => s.id === creado);

    expect(nuestro, "el servicio recién creado no sale en la lista").toBeTruthy();
    expect(nuestro!.empresa).toBe("Enel");
    expect(nuestro!.diaPrimerAviso).toBe(10);
    expect(nuestro!.codigoPais).toBe("CO");
  });

  it("un día que no es del mes lo rechaza la base, no solo el formulario", async () => {
    /*
      El formulario ya lo valida con zod, y eso no basta: un RPC o un `insert`
      por PostgREST no pasa por el formulario. Es la lección del aforo de las
      zonas comunes, que se respetaba solo en el desplegable y aceptaba 200
      acompañantes en una zona de 20.
    */
    await expect(
      agregarServicioDeVivienda({
        unidadId: U102,
        nombre: `${MARCA} imposible`,
        diaPrimerAviso: 45,
      }),
    ).rejects.toThrow(/primer_aviso_es_dia|check constraint/i);

    // Y un nombre en blanco tampoco, que es la otra mitad de la regla.
    await expect(
      agregarServicioDeVivienda({ unidadId: U102, nombre: "   " }),
    ).rejects.toThrow(/nombre_no_vacio|check constraint/i);
  });
});

describe("quién lo ve", () => {
  it("la administración del edificio no, aunque administre esa vivienda", async () => {
    await salir();
    await entrarComo(ADMIN);
    try {
      /*
        Se pide **explícitamente** el servicio de la 102, por su id. Mirar solo
        «lo que veo es mío» pasaría igual con la política abierta de par en par
        si resulta que no tengo ninguno.
      */
      const { data, error } = await supabase
        .from("servicio_de_vivienda")
        .select("id")
        .eq("id", creado);

      // RLS no da error: devuelve nada. Las dos cosas se comprueban.
      expect(error).toBeNull();
      expect(data).toEqual([]);

      // Y el control positivo: la administración **sí** ve la vivienda. Si no
      // viera nada de nada, lo de arriba no probaría el límite sino la sesión.
      const { data: unidad } = await supabase
        .from("unidad")
        .select("id, codigo")
        .eq("id", U102)
        .maybeSingle();
      expect(unidad, "la administración debería ver la vivienda").toBeTruthy();
    } finally {
      await salir();
    }
  });

  it("la portería tampoco", async () => {
    await entrarComo(GUARDIA);
    try {
      const { data } = await supabase
        .from("servicio_de_vivienda")
        .select("id")
        .eq("id", creado);
      expect(data).toEqual([]);
    } finally {
      await salir();
    }
  });

  it("y quien no gestiona la vivienda no puede escribir en ella", async () => {
    /*
      La administración puede **ver** la vivienda y aun así no debe poder
      ponerle un servicio: `gestiona_la_vivienda` deja fuera al coadministrador
      a propósito, al revés que `puede_invitar_a_unidad`.
    */
    await entrarComo(ADMIN);
    try {
      await expect(
        agregarServicioDeVivienda({
          unidadId: U102,
          nombre: `${MARCA} de la administración`,
        }),
      ).rejects.toThrow(/row-level security|policy/i);
    } finally {
      await salir();
    }

    // Comprobado contando, que es lo único que no miente: no quedó la fila.
    const { count } = await servicio
      .from("servicio_de_vivienda")
      .select("id", { count: "exact", head: true })
      .like("nombre", `${MARCA} de la administración`);
    expect(count).toBe(0);
  });
});

describe("y se puede quitar", () => {
  it("el propietario borra el suyo", async () => {
    await entrarComo(SOFIA);
    await borrarServicioDeVivienda(creado);

    const { data } = await supabase
      .from("servicio_de_vivienda")
      .select("id")
      .eq("id", creado);
    expect(data).toEqual([]);
    await salir();
  });
});
