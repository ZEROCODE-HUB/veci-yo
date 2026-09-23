import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El orden entre crear la PQRS y subir sus adjuntos.
 *
 * El formulario decía "Podrás adjuntar documentos e imágenes una vez creada la
 * PQRS": era cierto, pero una queja por ruido o una fuga se sostienen con una
 * foto, y pedirla en un segundo paso hace que casi nadie la suba.
 *
 * No se puede invertir el orden ni por comodidad: la política del bucket
 * comprueba que quien sube **puede ver el reclamo**, así que la fila tiene que
 * existir antes de que haya dónde colgar el archivo. Estas pruebas fijan eso,
 * que es justo lo que un refactor rompería sin que salte ningún tipo.
 */

const subirArchivo = vi.fn();
const borrarArchivo = vi.fn();

/** Lo que se le pidió a la base, en orden. */
let llamadas: string[] = [];
/** Falla la inserción de `adjunto_reclamo`. */
let fallaAdjunto = false;

vi.mock("@/shared/services/archivos", () => ({
  subirArchivo: (...args: unknown[]) => subirArchivo(...args),
  borrarArchivo: (...args: unknown[]) => borrarArchivo(...args),
}));
vi.mock("@/shared/utils", () => ({ formatDate: (d: Date) => d.toISOString() }));
vi.mock("@/shared/services/supabase", () => ({
  supabase: {
    from(tabla: string) {
      return {
        insert(fila: unknown) {
          llamadas.push(`insert:${tabla}`);
          if (tabla === "adjunto_reclamo") {
            return Promise.resolve(
              fallaAdjunto ? { error: new Error("rechazado") } : { error: null },
            ) as any;
          }
          return {
            select() {
              return {
                single: () =>
                  Promise.resolve({
                    data: {
                      id: "id-de-la-pqrs",
                      numero: "PQRS-0007",
                      area: "condominio",
                    },
                    error: null,
                    fila,
                  }),
              };
            },
          } as any;
        },
      };
    },
  },
}));

const { crearReclamo } = await import("./pqrs.repo");

const DATOS = {
  titulo: "Fuga en el pasillo",
  descripcion: "Lleva dos días",
  area: "Condominio",
  tipo: "Queja",
  destinatario: "",
  correo: "",
  telefono: "",
  medioContacto: "",
  modelo: "",
};

const PARAMS = {
  datos: DATOS,
  condominioId: "c1",
  unidadId: "u1",
  usuarioId: "quien-reclama",
  nombre: "Sofía Martínez",
};

beforeEach(() => {
  llamadas = [];
  fallaAdjunto = false;
  subirArchivo.mockReset();
  subirArchivo.mockResolvedValue({ ruta: "id-de-la-pqrs/archivo.png" });
  borrarArchivo.mockReset();
});

const ARCHIVO = {
  uri: "file:///foto.png",
  nombre: "foto.png",
  tipoMime: "image/png",
};

describe("crearReclamo con adjuntos", () => {
  it("sube los archivos después de insertar, y en la carpeta del reclamo", async () => {
    const resultado = await crearReclamo({ ...PARAMS, adjuntos: [ARCHIVO] });

    expect(llamadas[0]).toBe("insert:reclamo");
    expect(subirArchivo).toHaveBeenCalledWith({
      bucket: "pqrs",
      // El primer segmento de la ruta es lo que lee la política del bucket, y
      // tiene que ser el id que acaba de devolver la base, no uno inventado.
      carpeta: "id-de-la-pqrs",
      archivo: ARCHIVO,
    });
    expect(resultado.adjuntosFallidos).toBe(0);
    expect(resultado.numero).toBe("PQRS-0007");
  });

  it("sin adjuntos no toca el bucket", async () => {
    await crearReclamo(PARAMS);
    expect(subirArchivo).not.toHaveBeenCalled();
  });

  it("si un adjunto falla, la PQRS queda creada y se dice cuántos", async () => {
    /*
      El caso que decide el diseño: deshacer la PQRS porque una foto no subió
      sería peor que quedarse sin la foto. Desde el detalle se puede volver a
      colgar.
    */
    fallaAdjunto = true;

    const resultado = await crearReclamo({
      ...PARAMS,
      adjuntos: [ARCHIVO, ARCHIVO],
    });

    expect(resultado.numero).toBe("PQRS-0007");
    expect(resultado.adjuntosFallidos).toBe(2);
    // Y el archivo huérfano se retira del bucket.
    expect(borrarArchivo).toHaveBeenCalledTimes(2);
  });
});
