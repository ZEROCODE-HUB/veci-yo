/**
 * helpContent — Contenido contextual ÚNICO del sistema de ayuda.
 *
 * Centraliza los textos educativos y orientados a la acción que muestran los
 * InfoButton en toda la app, para mantener consistencia de voz y contenido.
 *
 * Cada entrada de módulo define:
 *  - info:    ayuda informativa (qué hace + métricas/ejemplos).
 *  - bloqueo: explicación cuando la función está bloqueada por falta de
 *             propiedades (qué hace · por qué bloqueada · cómo habilitarla).
 *
 * La acción para habilitar es siempre la misma: registrar una propiedad desde
 * el selector de propiedades de la barra superior.
 */

const ACCION_AGREGAR =
  'Agrega tu propiedad desde el selector de propiedades en la barra superior ("Administrar mis ubicaciones"). Al registrarla, este módulo se habilita automáticamente.';

export const HELP = {
  propiedades: {
    info: {
      titulo: 'Tus propiedades',
      descripcion:
        'Aquí se listan las propiedades (viviendas) que tienes registradas. La propiedad activa define la información y las funciones que ves en la app.',
      bullets: [
        'Cambia entre tus propiedades tocando su nombre.',
        'Marca una como favorita para que sea la activa por defecto.',
        'Agrega o quita propiedades desde "Administrar mis ubicaciones".',
      ],
      ejemplo: 'Ej.: "Casa Amorcito" en Miraflores y "Casa Mamá" en Cusco, alternables desde aquí.',
    },
    bloqueo: {
      titulo: 'Registra tu primera propiedad',
      descripcion: 'Las propiedades son la base de Veciyo: conectan tu vivienda con su condominio.',
      motivo: 'Todavía no agregaste ninguna propiedad, por eso los módulos de tu vivienda están bloqueados.',
      accion: ACCION_AGREGAR,
    },
  },

  correspondencia: {
    info: {
      titulo: 'Correspondencia',
      descripcion: 'Gestiona los paquetes y envíos que llegan a la portería de tu condominio.',
      bullets: [
        'Estado "No recibido": el paquete fue informado pero aún no llega.',
        'Estado "Portería": está en portería, listo para retirar.',
        'Estado "Entregado": ya fue entregado al destinatario.',
      ],
      ejemplo: 'Ej.: "DHL: 506 C — Guillermo Paredes" en estado Portería.',
    },
    bloqueo: {
      titulo: 'Correspondencia',
      descripcion: 'Recibe y haz seguimiento de los paquetes que llegan a la portería de tu vivienda.',
      motivo: 'La correspondencia se asocia a una vivienda y a su portería; sin una propiedad registrada no hay a dónde vincularla.',
      accion: ACCION_AGREGAR,
    },
  },

  visitas: {
    info: {
      titulo: 'Visitas',
      descripcion: 'Registra y autoriza a tus visitas e invitados para agilizar su ingreso al condominio.',
      bullets: [
        'Estado "Pendiente": la visita espera aprobación.',
        'Estado "Aceptado": autorizada para ingresar.',
        'Estado "Rechazado": no autorizada.',
        'Genera un código QR para un ingreso más rápido.',
      ],
      ejemplo: 'Ej.: autorizar a "Amigos y Familiares" para el sábado con QR de acceso.',
    },
    bloqueo: {
      titulo: 'Visitas',
      descripcion: 'Autoriza visitas e invitados y entrégales un acceso con código QR.',
      motivo: 'Las autorizaciones de ingreso dependen de la vivienda que visitan; necesitas una propiedad registrada.',
      accion: ACCION_AGREGAR,
    },
  },

  zonas: {
    info: {
      titulo: 'Zonas comunes',
      descripcion: 'Reserva los espacios compartidos del condominio (BBQ, gimnasio, piscina, etc.).',
      bullets: [
        'El número muestra los cupos disponibles sobre el total.',
        'Un borde resaltado indica que la zona está completa.',
        'Reserva eligiendo fecha y horario disponibles.',
      ],
      ejemplo: 'Ej.: "BBQ 2/5" → 2 cupos libres de 5 para hoy.',
    },
    bloqueo: {
      titulo: 'Zonas comunes',
      descripcion: 'Reserva los espacios compartidos de tu condominio.',
      motivo: 'Las reservas pertenecen al condominio de tu vivienda; sin una propiedad registrada no hay zonas asociadas.',
      accion: ACCION_AGREGAR,
    },
  },

  anuncios: {
    info: {
      titulo: 'Anuncios',
      descripcion: 'Consulta los comunicados del condominio y participa en las votaciones vecinales.',
      bullets: [
        'Filtra por categoría o por fecha.',
        'Los anuncios con encuesta permiten votar.',
        'Toca un anuncio para ver el detalle completo.',
      ],
      ejemplo: 'Ej.: "Mantenimiento — Corte de agua el martes 9 a 12 h".',
    },
    bloqueo: {
      titulo: 'Anuncios',
      descripcion: 'Recibe los comunicados de tu condominio y vota en las decisiones vecinales.',
      motivo: 'Los anuncios son propios de cada condominio; necesitas una propiedad registrada para verlos.',
      accion: ACCION_AGREGAR,
    },
  },

  reglas: {
    info: {
      titulo: 'Reglamentos',
      descripcion: 'Consulta las reglas del condominio para residentes permanentes y huéspedes temporales.',
      bullets: [
        'Estado "Inscripto": el departamento aceptó el reglamento.',
        'Estado "Pendiente": aún no responde.',
        'Estado "No inscripto": no está adherido.',
      ],
      ejemplo: 'Ej.: revisar las reglas para "Huésped Temporal" antes de recibir visitas.',
    },
    bloqueo: {
      titulo: 'Reglamentos',
      descripcion: 'Consulta y acepta los reglamentos de tu condominio.',
      motivo: 'Los reglamentos corresponden al condominio de tu vivienda; necesitas una propiedad registrada.',
      accion: ACCION_AGREGAR,
    },
  },

  ranking: {
    info: {
      titulo: 'Ranking / Cuadro de honor',
      descripcion: 'Reconoce a los vecinos más colaborativos según su reputación y aportes a la comunidad.',
      bullets: [
        'La puntuación refleja la convivencia y participación.',
        'Las medallas premian logros específicos.',
        'Sube de posición participando en tu comunidad.',
      ],
      ejemplo: 'Ej.: "Reciclador del mes" por separar residuos correctamente.',
    },
    bloqueo: {
      titulo: 'Ranking / Cuadro de honor',
      descripcion: 'Participa en el reconocimiento entre vecinos de tu condominio.',
      motivo: 'El ranking es por condominio; necesitas una propiedad registrada para participar.',
      accion: ACCION_AGREGAR,
    },
  },
};

/** Texto del banner de modo incógnito reutilizado en los módulos. */
export const INCOGNITO_BANNER = {
  titulo: 'Estás explorando en modo incógnito',
  descripcion:
    'Los datos que ves son de ejemplo, para que conozcas cómo funciona Veciyo. Crea una cuenta y registra tu propiedad para usar tus datos reales.',
};
