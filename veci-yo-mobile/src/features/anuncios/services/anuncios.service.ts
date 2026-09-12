import { useAnunciosStore } from "../stores/anuncios.store";
import type { Anuncio, AnuncioFormValues } from "../types/anuncios";

const pause = () => new Promise((resolve) => setTimeout(resolve, 150));

export async function fetchAnunciosRequest() {
  await pause();
  return useAnunciosStore.getState().anuncios;
}

export async function createAnuncioRequest(
  values: AnuncioFormValues,
): Promise<Anuncio> {
  await pause();
  const now = new Date();
  const date = values.fechaPublicada || now;
  const end = values.fechaFinalizacion || date;
  return {
    id: Date.now(),
    categoria: values.categoria,
    titulo: values.titulo.trim(),
    descripcion: values.descripcion.trim(),
    fechaPublicada: date.toLocaleDateString("es-AR"),
    fechaFinalizacion: end.toLocaleDateString("es-AR"),
    fechaCorta: date.toLocaleDateString("es-AR"),
    votacion: values.tipo === "Encuesta",
    umbral: Number(values.umbral) || undefined,
    opcionesVotacion: values.opcionesVotacion
      .map((item) => item.valor.trim())
      .filter(Boolean),
    ocultarResultados: values.ocultarResultados,
    votacionMultiple: values.votacionMultiple,
    paraPropietarios: values.paraPropietarios,
    paraResidentes: values.paraResidentes,
    paraHuespedes: values.paraHuespedes,
  };
}
