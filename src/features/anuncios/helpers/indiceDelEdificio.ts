import type { IndiceDelEdificio } from "../services/anuncios.repo";

/** 87.5 → «87,5». */
function porcentaje(n: number): string {
  return String(Math.round(n * 10000) / 10000).replace(".", ",");
}

/**
 * Lo que dice la opción «Según el índice de votación» al crear una encuesta
 * (18/11/2026): solo se puede elegir cuando todos los departamentos tienen su
 * índice y suman 100 %. Si no, por qué no y dónde se arregla.
 */
export function opcionPorIndice(estado: IndiceDelEdificio | null): { detalle: string; sePuede: boolean } {
  if (!estado) {
    return { sePuede: false, detalle: "Revisando cuánto suman los índices de los departamentos…" };
  }
  if (estado.completo) {
    return {
      sePuede: true,
      detalle: "Cada departamento vale su índice. Entre todos suman 100 %.",
    };
  }
  const faltan =
    estado.sinIndice === 0
      ? ""
      : estado.sinIndice === 1
        ? " y 1 departamento no tiene índice"
        : ` y ${estado.sinIndice} departamentos no tienen índice`;
  return {
    sePuede: false,
    detalle: `Todavía no se puede: los departamentos suman ${porcentaje(estado.suma)} %${faltan}, y tienen que sumar 100 %. Se completa en Arquitectura › Torres, al editar cada departamento.`,
  };
}
