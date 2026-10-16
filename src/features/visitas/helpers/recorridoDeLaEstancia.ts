import type { VisitaItem } from "@/shared/types";

/**
 * El recorrido entero de una estancia, de la reserva a la salida.
 *
 * Lo pidió la responsable de producto el 14/10/2026: «mostrar desde que
 * ingresa la reservación por Airbnb o manual, el preregistro, el registro
 * físico en portería, el uso de la app del huésped», y «todo el flujo del
 * huésped termina en la salida». Cada persona ya tenía sus pasos; faltaba la
 * vista de la estancia.
 */
export type ClavePaso =
  | "origen"
  | "preregistro"
  | "verificacion"
  | "entrada"
  | "app"
  | "salida";

export interface PasoDeLaEstancia {
  clave: ClavePaso;
  titulo: string;
  hecho: boolean;
  detalle: string;
}

export function recorridoDeLaEstancia(visita: VisitaItem): PasoDeLaEstancia[] {
  const personas = visita.invitados ?? [];
  const adultos = personas.filter((p) => !p.esMenor);
  const titular = personas[0];
  const cerrado = Boolean(titular?.timeline?.precheckinCerrado);
  const enviado = Boolean(titular?.timeline?.preregistroEnviado);

  const enRevision = adultos.filter((p) => p.verificacion === "revision").length;
  const verificados = adultos.filter(
    (p) => p.verificacion === "aprobada" || p.verificacion === "aprobada_manual",
  ).length;

  const dentro = personas.filter((p) => p.llego);
  const salieron = personas.filter((p) => p.horaSalida);
  const finalizada = visita.estado === "Finalizado";

  return [
    {
      clave: "origen",
      titulo: "Reserva",
      hecho: true,
      detalle:
        visita.origen === "calendario"
          ? visita.plataforma === "airbnb"
            ? "Llegó del calendario de Airbnb"
            : visita.plataforma === "booking"
              ? "Llegó del calendario de Booking"
              : "Llegó del calendario de Airbnb o Booking"
          : visita.plataforma === "airbnb"
            ? "De Airbnb, creada a mano en Veciyo"
            : visita.plataforma === "booking"
              ? "De Booking, creada a mano en Veciyo"
              : "Directa, creada en Veciyo",
    },
    {
      clave: "preregistro",
      titulo: "Preregistro",
      hecho: cerrado,
      detalle: cerrado ? "Completo" : enviado ? "Enlace enviado, sin terminar" : "Sin enviar",
    },
    {
      clave: "verificacion",
      titulo: "Verificación",
      hecho: adultos.length > 0 && verificados === adultos.length,
      detalle:
        enRevision > 0
          ? `${enRevision === 1 ? "1 persona requiere" : `${enRevision} personas requieren`} tu aprobación`
          : adultos.length === 0
            ? "Sin adultos registrados"
            : `${verificados} de ${adultos.length} verificadas`,
    },
    {
      clave: "entrada",
      titulo: "Entrada en portería",
      hecho: dentro.length > 0,
      detalle:
        dentro.length === 0
          ? "Todavía no llegan"
          : `Entraron ${dentro.length} de ${personas.length}` +
            (dentro[0]?.fechaIngreso ? ` · ${dentro[0].fechaIngreso} ${dentro[0].horaIngreso ?? ""}`.trimEnd() : ""),
    },
    {
      clave: "app",
      titulo: "Cuenta en la app",
      hecho: Boolean(titular?.tieneCuenta),
      detalle: titular?.tieneCuenta
        ? "El huésped usa la app"
        : "El huésped no ha creado su cuenta",
    },
    {
      clave: "salida",
      titulo: "Salida",
      hecho: finalizada,
      detalle: finalizada
        ? "Estancia completa"
        : salieron.length > 0
          ? `Salieron ${salieron.length} de ${personas.length}`
          : "Todavía no salen",
    },
  ];
}
