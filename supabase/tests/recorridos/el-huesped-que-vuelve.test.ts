import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, isoEnDias, salir, servicio, supabase, ventanaDe } from "./cliente";
import { misDatosParaPrecheckin } from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el huesped que ya se alojo no vuelve a escribir sus datos.
 *
 * Pedido por el cliente el 09/10/2026. Cuando alguien crea su cuenta al
 * terminar un preregistro, su ficha de esa estancia queda enlazada a el. La
 * siguiente vez, con la sesion abierta, la web se la devuelve.
 *
 * Lo que se vigila: la funcion no recibe a quien mirar. Devuelve lo de quien
 * llama, y de nadie mas.
 */

const V = ventanaDe("el-huesped-que-vuelve");

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
// Tomas: solo es huesped. No tiene mas papeles que confundan el resultado.
const HUESPED = "nuevo.inquilino@veciyo.test";
const OTRA_PERSONA = "vecino@veciyo.test";
const MARCA = "[prueba] el huesped que vuelve";

let visitaId = "";

async function retirar() {
  const { data } = await servicio
    .from("visita")
    .select("id")
    .eq("unidad_id", U205)
    .eq("anotaciones_ingreso", MARCA);
  const ids = (data ?? []).map((v) => v.id);
  if (ids.length === 0) return;
  const { error } = await servicio.from("visita").delete().in("id", ids);
  if (error) throw new Error(`No se pudo retirar: ${error.message}`);
}

beforeAll(async () => {
  await retirar();
  const huespedId = await entrarComo(HUESPED);
  await salir();

  // Una estancia suya de antes, ya con su cuenta enlazada: es lo que deja
  // `enlazar_cuenta_con_estancia` cuando acepta su acceso.
  const { data, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U205,
      tipo: "huesped_temporal",
      fecha_desde: isoEnDias(V),
      fecha_hasta: isoEnDias(V + 2),
      anotaciones_ingreso: MARCA,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  visitaId = data.id;

  const { error: e2 } = await servicio.from("invitado").insert({
    visita_id: visitaId,
    orden: 0,
    es_titular: true,
    usuario_id: huespedId,
    nombre: "Tomas",
    apellidos: "Que Vuelve",
    tipo_documento: "pasaporte",
    documento_numero: "[prueba]-PA998877",
    telefono: "3001112233",
    codigo_pais: "CO",
    direccion: "Calle de la prueba 12",
    fecha_nacimiento: "1990-05-17",
    ciudad_residencia: "Lima",
    ciudad_procedencia: "Cusco",
  });
  if (e2) throw new Error(e2.message);
});

afterAll(async () => {
  await retirar();
  await salir();
});

describe("quien ya se alojo", () => {
  it("recibe los datos de su ultima estancia", async () => {
    await entrarComo(HUESPED);
    const datos = await misDatosParaPrecheckin(supabase as never);

    expect(datos).toMatchObject({
      nombre: "Tomas",
      apellidos: "Que Vuelve",
      tipoDocumento: "pasaporte",
      documento: "[prueba]-PA998877",
      telefono: "3001112233",
      codigoPais: "CO",
      direccion: "Calle de la prueba 12",
      fechaNacimiento: "1990-05-17",
      ciudadResidencia: "Lima",
      ciudadProcedencia: "Cusco",
    });
    // El correo es el de su cuenta: con el se le emite el acceso.
    expect(datos?.correo).toBe(HUESPED);
  });

  it("otra persona con sesion no recibe los de el", async () => {
    await entrarComo(OTRA_PERSONA);
    const datos = await misDatosParaPrecheckin(supabase as never);

    // Lo suyo o nada, pero nunca lo de Tomas.
    expect(datos?.documento ?? "").not.toBe("[prueba]-PA998877");
    expect(datos?.apellidos ?? "").not.toBe("Que Vuelve");
    if (datos) expect(datos.correo).toBe(OTRA_PERSONA);
  });

  it("y sin sesion no se le da nada a nadie", async () => {
    await salir();
    await expect(misDatosParaPrecheckin(supabase as never)).rejects.toThrow(
      /permission denied/i,
    );
  });
});
