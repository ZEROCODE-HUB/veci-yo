/**
 * Por qué la portería todavía no puede marcar la llegada de alguien.
 *
 * Tres decisiones del cliente del 12/10/2026, que la base ya exige
 * (`no_entra_si_el_documento_no_coincide`). Esto es para que la pantalla no
 * ofrezca lo que la base va a negar, y diga el motivo antes de pulsar:
 *
 *   · en una **estancia**, el adulto necesita su documento verificado, y sin
 *     documento registrado no entra;
 *   · el **menor** de una estancia entra cuando está verificado el adulto que
 *     responde por él;
 *   · en una **visita corriente** lo decide el edificio --«La portería
 *     verifica el documento»--, y solo para quien declaró documento.
 */
export interface PersonaEnPuerta {
  uuid?: string;
  nombre: string;
  llego?: boolean;
  esMenor?: boolean;
  responsableId?: string;
  ciVerificado?: boolean;
}

export interface BloqueoDeLlegada {
  motivo: string;
  /** Si se resuelve verificando el documento de **esta** persona. */
  seVerificaAqui: boolean;
}

export function bloqueoDeLlegada(datos: {
  esEstancia: boolean;
  /** El interruptor del edificio. En una estancia no se mira. */
  exigeDocumento: boolean;
  persona: PersonaEnPuerta;
  tieneDocumento: boolean;
  grupo: PersonaEnPuerta[];
}): BloqueoDeLlegada | null {
  const { esEstancia, exigeDocumento, persona, tieneDocumento, grupo } = datos;
  if (persona.llego) return null;

  const porVerificar: BloqueoDeLlegada = {
    motivo: "Primero verifica su documento.",
    seVerificaAqui: true,
  };

  if (!esEstancia) {
    return exigeDocumento && tieneDocumento && !persona.ciVerificado
      ? porVerificar
      : null;
  }

  if (persona.esMenor) {
    const adulto = grupo.find(
      (otro) => otro.uuid && otro.uuid === persona.responsableId,
    );
    if (!adulto) {
      return {
        motivo: "No tiene un adulto responsable registrado: no puede ingresar.",
        seVerificaAqui: false,
      };
    }
    return adulto.ciVerificado
      ? null
      : {
          motivo: `Entra cuando se verifique el documento de ${adulto.nombre}.`,
          seVerificaAqui: false,
        };
  }

  if (!tieneDocumento) {
    return {
      motivo:
        "No tiene documento registrado: tiene que completar su registro antes de ingresar.",
      seVerificaAqui: false,
    };
  }
  return persona.ciVerificado ? null : porVerificar;
}
