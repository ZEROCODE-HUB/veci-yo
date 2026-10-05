import { parseFechaIso } from "@/shared/utils";
import {
  anuncioFormVacio,
  type Anuncio,
  type AnuncioFormValues,
} from "../../types/anuncios";

/**
 * El anuncio que ya existe, puesto en el formulario para corregirlo.
 *
 * Va aparte del modal porque es una traducción, no interfaz, y porque así se
 * puede probar sola: lo que importa es que **no se pierda nada** al abrir el
 * formulario. Si un campo no se rellena, al guardar se guarda vacío --y eso en
 * un anuncio ya publicado es peor que no poder corregirlo--.
 *
 * Las fechas se leen de `publicadaDesdeIso`, no de `fechaPublicada`. Esa es la
 * formateada --`dd/mm/aaaa`, porque es lo que se pinta en la tarjeta-- y
 * `parseFechaIso` espera `aaaa-mm-dd`: devolvía `null`, el formulario abría sin
 * fechas, y el esquema --que las exige-- no dejaba guardar. O sea que corregir
 * un anuncio habría sido imposible por un separador.
 */
export function desdeElAnuncio(anuncio: Anuncio): AnuncioFormValues {
  return {
    ...anuncioFormVacio(),
    tipo: anuncio.votacion ? "Encuesta" : "Anuncio",
    titulo: anuncio.titulo,
    descripcion: anuncio.descripcion,
    categoria: anuncio.categoria,
    paraPropietarios: anuncio.paraPropietarios ?? false,
    paraResidentes: anuncio.paraResidentes ?? false,
    paraHuespedes: anuncio.paraHuespedes ?? false,
    umbral: anuncio.umbral ? String(anuncio.umbral) : "",
    fechaPublicada: parseFechaIso(anuncio.publicadaDesdeIso),
    fechaFinalizacion: parseFechaIso(anuncio.publicadaHastaIso),
    ocultarResultados: anuncio.ocultarResultados ?? false,
    votacionMultiple: anuncio.votacionMultiple ?? false,
    /*
      Las opciones se pintan para que se vean, y el guardado las ignora: con
      votos ya emitidos, cambiarlas convertiría el recuento en una mentira.
    */
    opcionesVotacion: (anuncio.opcionesVotacion ?? []).length
      ? (anuncio.opcionesVotacion ?? []).map((valor) => ({ valor }))
      : [{ valor: "" }, { valor: "" }],
    /*
      Se hereda lo que se eligió al publicar: si no se quiso avisar del
      anuncio, tampoco se avisa de la corrección. Y `avisarDelCambio` arranca
      en falso siempre: avisar de un cambio se pide, no se arrastra.
    */
    avisar: anuncio.avisar ?? true,
    avisarDelCambio: false,
  };
}
