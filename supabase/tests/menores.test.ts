import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Un residente menor de edad.
 *
 * KT, flujo 4.3 paso 3: *"Al crear un Residente, puede marcar si es menor de
 * edad (checkbox) → **sin acceso a la plataforma**"* `[DECIDIDO]`.
 *
 * Las tres columnas estaban desde el primer día —`es_menor`, `puede_acceder` y
 * un `usuario_id` que admite NULL— y no había forma de llegar a ellas: el
 * único camino para dar de alta a alguien es la invitación, que siempre exige
 * un correo y emite un enlace para crear una cuenta.
 *
 * Lo que se comprueba es la regla, no el formulario: un menor **no puede**
 * acabar con cuenta ni con acceso, venga por donde venga.
 */

const MARCA = "[prueba menor]";

let guillermo: Sesion;
let marcela: Sesion;
let laura: Sesion;

beforeAll(async () => {
  [guillermo, marcela, laura] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.admin),
    entrar(CUENTA.laura),
  ]);
});

afterEach(async () => {
  await api(
    marcela,
    `/rest/v1/membresia_unidad?nombre=like.${encodeURIComponent(MARCA + "%")}`,
    { metodo: "DELETE" },
  );
});

describe("darlo de alta", () => {
  it("el propietario lo registra, sin correo y sin invitación", async () => {
    const alta = await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: `${MARCA} Martina`,
      p_telefono: "+57 300 1234567",
    });
    expect(alta.estado).toBe(200);

    const fila = await leer(
      guillermo,
      `membresia_unidad?unidad_id=eq.${UNIDAD.u101}&nombre=like.${encodeURIComponent(MARCA + "%")}&select=rol,es_menor,puede_acceder,usuario_id,telefono`,
    );
    expect(fila.datos).toHaveLength(1);
    expect(fila.datos[0].rol).toBe("residente");
    expect(fila.datos[0].es_menor).toBe(true);
    // Lo que decide el KT: figura, pero no entra.
    expect(fila.datos[0].puede_acceder).toBe(false);
    expect(fila.datos[0].usuario_id).toBeNull();
    expect(fila.datos[0].telefono).toBe("+57 300 1234567");

    // Y no emite ninguna invitación: no hay cuenta que crear.
    const invitaciones = await leer(
      guillermo,
      `invitacion?unidad_id=eq.${UNIDAD.u101}&select=id&estado=eq.pendiente`,
    );
    for (const inv of invitaciones.datos) {
      expect(inv.nombre).not.toContain(MARCA);
    }
  });

  it("un vecino no registra a nadie en una vivienda ajena", async () => {
    const intento = await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u102,
      p_nombre: `${MARCA} ajeno`,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("sin nombre no se registra", async () => {
    const intento = await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: "   ",
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("la regla se cumple venga por donde venga", () => {
  it("nadie inserta un menor con cuenta", async () => {
    /*
      La función pone las cuatro banderas, pero la política de alta permite un
      insert directo: si la garantía viviera solo en la función, bastaría con
      no usarla. Por eso es una restricción de la tabla.
    */
    const intento = await insertar(guillermo, "membresia_unidad", {
      unidad_id: UNIDAD.u101,
      usuario_id: laura.usuarioId,
      nombre: `${MARCA} con cuenta`,
      rol: "residente",
      es_menor: true,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  /*
    Esta pasa por una restriccion que ya existia —`con_acceso_requiere_cuenta`,
    que exige `usuario_id` para tener acceso— y no por la de menores. Se deja
    porque la regla es la que importa, pero queda dicho: al mutar la
    restriccion nueva, esta sigue verde, y eso no significa que no sirva.
  */
  it("nadie inserta un menor con acceso", async () => {
    const intento = await insertar(guillermo, "membresia_unidad", {
      unidad_id: UNIDAD.u101,
      nombre: `${MARCA} con acceso`,
      rol: "residente",
      es_menor: true,
      puede_acceder: true,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  /* Igual que la anterior: lo bloquea `con_acceso_requiere_cuenta`. */
  it("y tampoco se le da acceso después", async () => {
    await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: `${MARCA} Martina`,
    });
    const fila = await leer(
      guillermo,
      `membresia_unidad?unidad_id=eq.${UNIDAD.u101}&nombre=like.${encodeURIComponent(MARCA + "%")}&select=id`,
    );

    const intento = await api(
      guillermo,
      `/rest/v1/membresia_unidad?id=eq.${fila.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { puede_acceder: true } },
    );
    expect(fueRechazada(intento)).toBe(true);

    const despues = await leer(
      guillermo,
      `membresia_unidad?id=eq.${fila.datos[0].id}&select=puede_acceder`,
    );
    expect(despues.datos[0].puede_acceder).toBe(false);
  });

  it("la condición de menor no se apaga sobre una membresía existente", async () => {
    /*
      Sería la forma de saltarse lo anterior: quitar la casilla, dar acceso, y
      volver a ponerla. Un menor que cumple años se da de baja y se invita como
      cualquier otra persona: la cuenta nace de una invitación.
    */
    await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: `${MARCA} Martina`,
    });
    const fila = await leer(
      guillermo,
      `membresia_unidad?unidad_id=eq.${UNIDAD.u101}&nombre=like.${encodeURIComponent(MARCA + "%")}&select=id`,
    );

    const intento = await api(
      guillermo,
      `/rest/v1/membresia_unidad?id=eq.${fila.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { es_menor: false } },
    );
    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero corregirle el nombre sí se puede", async () => {
    // Control positivo: la protección es de la casilla, no de la fila entera.
    await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: `${MARCA} Martna`,
    });
    const fila = await leer(
      guillermo,
      `membresia_unidad?unidad_id=eq.${UNIDAD.u101}&nombre=like.${encodeURIComponent(MARCA + "%")}&select=id`,
    );

    const cambio = await api(
      guillermo,
      `/rest/v1/membresia_unidad?id=eq.${fila.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { nombre: `${MARCA} Martina` } },
    );
    expect(cambio.estado).toBeLessThan(300);
  });
});

describe("no cuenta como usuario", () => {
  it("figura en la vivienda para quien la gestiona", async () => {
    await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: `${MARCA} Martina`,
    });

    const personas = await leer(
      guillermo,
      `membresia_unidad?unidad_id=eq.${UNIDAD.u101}&activo=is.true&select=nombre,es_menor`,
    );
    const menor = personas.datos.find((p: any) => p.nombre.startsWith(MARCA));
    expect(menor).toBeTruthy();
    expect(menor.es_menor).toBe(true);
  });

  it("y la portería lo ve, que es para lo que existe", async () => {
    await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: `${MARCA} Martina`,
    });

    const guardia = await entrar(CUENTA.guardia);
    const personas = await leer(
      guardia,
      `membresia_unidad?unidad_id=eq.${UNIDAD.u101}&select=nombre`,
    );
    expect(
      personas.datos.some((p: any) => p.nombre.startsWith(MARCA)),
    ).toBe(true);
  });
});

/**
 * El contacto de emergencia.
 *
 * El formulario de alta lo pide —nombre, código de país y teléfono— y lo
 * escribía en un store de Zustand junto con todo lo demás. De un menor, que
 * no tiene cuenta ni la va a tener, es justamente de quien más falta hace
 * saber a quién llamar.
 */
describe("a quién llamar si pasa algo", () => {
  const creadas: string[] = [];

  afterAll(async () => {
    for (const id of creadas) {
      await api(marcela, `/rest/v1/membresia_unidad?id=eq.${id}`, {
        metodo: "DELETE",
      });
    }
  });

  it("se guarda al registrar a un menor", async () => {
    const creado = await rpc(guillermo, "registrar_menor", {
      p_unidad_id: UNIDAD.u101,
      p_nombre: "Menor con contacto",
      p_telefono: "3001234567",
      p_contacto_nombre: "Abuela Rosa",
      p_contacto_codigo: "+57",
      p_contacto_telefono: "3109998877",
    });
    expect(creado.estado).toBe(200);
    creadas.push(creado.datos);

    const leido = await leer(
      guillermo,
      `membresia_unidad?select=contacto_emergencia_nombre,contacto_emergencia_telefono&id=eq.${creado.datos}`,
    );
    expect(leido.datos[0].contacto_emergencia_nombre).toBe("Abuela Rosa");
    expect(leido.datos[0].contacto_emergencia_telefono).toBe("3109998877");
  });

  it("y viaja con la invitación de quien sí va a tener cuenta", async () => {
    /*
      Hasta que la persona acepta no hay membresía donde ponerlo, así que se
      guarda en la invitación y la base lo copia al aceptarla.
    */
    const invitada = await rpc(guillermo, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: `${MARCA} Con contacto`,
      p_unidad_id: UNIDAD.u101,
      p_rol_unidad: "residente",
      p_contacto_nombre: "Hermano Luis",
      p_contacto_codigo: "+57",
      p_contacto_telefono: "3112223344",
    });
    expect(invitada.estado).toBe(200);

    const fila = await leer(
      marcela,
      `invitacion?select=contacto_emergencia_nombre&id=eq.${invitada.datos[0].invitacion_id}`,
    );
    expect(fila.datos[0].contacto_emergencia_nombre).toBe("Hermano Luis");

    await api(
      marcela,
      `/rest/v1/invitacion?id=eq.${invitada.datos[0].invitacion_id}`,
      { metodo: "PATCH", cuerpo: { estado: "revocada" } },
    );
  });
});
