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
  /** Lo que anotó la portería al recibir a este menor (14/10/2026). */
  revisionMenor?: "se_parece" | "no_se_parece_seguro" | "no_se_parece_revisar";
  /** Para saber si el anfitrión ya lo aprobó a mano. */
  verificacion?: string;
}

export interface BloqueoDeLlegada {
  motivo: string;
  /** Si se resuelve verificando el documento de **esta** persona. */
  seVerificaAqui: boolean;
  /** Si se resuelve confirmando al menor con su documento (14/10/2026). */
  confirmarMenor?: boolean;
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

  /*
    Si el anfitrión no lo autorizó, no entra, y se dice (15/10/2026). La base
    ya lo negaba (`no_entra_si_el_anfitrion_lo_rechazo`), pero la pantalla le
    ofrecía a la portería «Verificar documento» como a cualquiera.
  */
  if (persona.verificacion === "rechazada") {
    return {
      motivo: `El anfitrión no autorizó a ${persona.nombre}: no puede entrar.`,
      seVerificaAqui: false,
    };
  }

  if (persona.esMenor) {
    const adulto = grupo.find(
      (otro) => otro.uuid && otro.uuid === persona.responsableId,
    );
    if (adulto?.verificacion === "rechazada") {
      return {
        motivo: `${adulto.nombre}, que responde por él, no fue autorizado por el anfitrión: no puede entrar.`,
        seVerificaAqui: false,
      };
    }
    if (!adulto) {
      return {
        motivo: "No tiene un adulto responsable registrado: no puede ingresar.",
        seVerificaAqui: false,
      };
    }
    if (!adulto.ciVerificado) {
      return {
        motivo: `Entra cuando se verifique el documento de ${adulto.nombre}.`,
        seVerificaAqui: false,
      };
    }
    /*
      Y la portería mira al niño con su documento en la mano (14/10/2026):
      lo pidió la responsable de producto. La base lo exige igual.
    */
    if (!persona.revisionMenor) {
      return {
        motivo: "Confírmalo con su documento antes de que entre.",
        seVerificaAqui: false,
        confirmarMenor: true,
      };
    }
    if (
      persona.revisionMenor === "no_se_parece_revisar" &&
      persona.verificacion !== "aprobada_manual"
    ) {
      return {
        motivo: "Espera a que el anfitrión lo revise: ya se le avisó.",
        seVerificaAqui: false,
      };
    }
    return null;
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
