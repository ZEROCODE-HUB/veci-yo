import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  fichaDelPrecheckin,
  guardarFicha,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el huésped cierra su enlace, vuelve, y encuentra lo que escribió.
 *
 * Hasta el 03/10/2026 no lo encontraba. Los once campos salían en blanco —y las
 * fotos del documento había que volver a subirlas sin saber siquiera si ya
 * estaban— **aunque todo estuviera guardado**. Lo que faltaba no era el dato:
 * era una función que lo devolviera. `consultar_precheckin` entrega la reserva
 * y no toca la tabla del invitado en ninguna línea.
 *
 * Para alguien que viaja, abandonar el preregistro a medias y volver más tarde
 * es el caso normal, no la excepción.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] el huesped vuelve";

let visitaId = "";
let token = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(6),
    fechaHasta: enDias(10),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });

  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();
});

afterAll(async () => {
  await entrarComo(ANFITRIONA);
  const { error } = await supabase.from("visita").delete().eq("id", visitaId);
  if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);
  await salir();
});

describe("antes de escribir nada", () => {
  it("la ficha viene vacía, y eso no es un error", async () => {
    /*
      La primera vez no hay nada que recuperar. Tiene que distinguirse de «el
      enlace no vale»: si esto lanzara, la pantalla mandaría al paso 1 a quien
      acaba de llegar por primera vez.
    */
    const ficha = await fichaDelPrecheckin(token, supabase as never);

    expect(ficha).not.toBeNull();
    expect(ficha!.documento).toBe("");
    expect(ficha!.terminosAceptados).toBe(false);
    expect(ficha!.tieneDocumento).toBe(false);
  });
});

describe("despues de escribir", () => {
  const ficha = {
    nombre: "Camila",
    apellidos: "Rojas",
    tipoDocumento: "cedula_ciudadania" as const,
    documento: "[prueba]-77665544",
    correo: "camila.vuelve@veciyo.test",
    telefono: "3001234567",
    direccion: "Calle 10 #20-30",
    motivo: "turismo" as const,
    fechaNacimiento: "1992-07-14",
    ciudadResidencia: "Medellín",
    ciudadProcedencia: "Lima",
    costo: 950000,
  };

  beforeAll(async () => {
    await guardarFicha(token, ficha, supabase as never);
  });

  it("se recupera todo lo que escribió, campo por campo", async () => {
    /*
      Los once. Comprobarlos uno a uno y no «alguno»: el defecto que esto cubre
      es que la pantalla arranque en blanco, y bastaría con que un campo no
      volviera para que el huésped tuviera que acordarse de cuál era.
    */
    const guardada = await fichaDelPrecheckin(token, supabase as never);

    expect(guardada!.nombre).toBe("Camila");
    expect(guardada!.apellidos).toBe("Rojas");
    expect(guardada!.tipoDocumento).toBe("cedula_ciudadania");
    expect(guardada!.documento).toBe("[prueba]-77665544");
    expect(guardada!.correo).toBe("camila.vuelve@veciyo.test");
    expect(guardada!.telefono).toBe("3001234567");
    expect(guardada!.direccion).toBe("Calle 10 #20-30");
    expect(guardada!.motivo).toBe("turismo");
    expect(guardada!.fechaNacimiento).toBe("1992-07-14");
    expect(guardada!.ciudadResidencia).toBe("Medellín");
    expect(guardada!.ciudadProcedencia).toBe("Lima");
    // El costo es de la reserva, no de la persona, y tambien vuelve.
    expect(Number(guardada!.costo)).toBe(950000);
  });

  it("y corregir un dato no crea otra ficha", async () => {
    /*
      Volver atrás y arreglar una letra es justo lo que esta pantalla permite
      ahora. Si cada envío creara una fila, la portería vería dos Camilas y
      ninguna forma de saber cuál vale.
    */
    await guardarFicha(
      token,
      { ...ficha, apellidos: "Rojas Machado" },
      supabase as never,
    );

    const guardada = await fichaDelPrecheckin(token, supabase as never);
    expect(guardada!.apellidos).toBe("Rojas Machado");

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("id")
      .eq("visita_id", visitaId);
    expect(data).toHaveLength(1);
    await salir();
  });
});

describe("el enlace de otro no sirve", () => {
  it("un token inventado no devuelve la ficha de nadie", async () => {
    /*
      La función corre sin sesión —el huésped no tiene cuenta— así que el token
      **es** la credencial. En la base solo vive su sha256; aquí se comprueba
      que no hay otra puerta.
    */
    await expect(
      fichaDelPrecheckin("no-soy-un-token", supabase as never),
    ).rejects.toThrow();
  });
});
