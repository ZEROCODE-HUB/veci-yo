import type { ReglaContenido, TipoRegla } from "./types/reglas";

const SECCIONES_BASE = [
  {
    title: "",
    items: [
      'Vivir en paz y sin interrupciones, lo que se conoce como "uso tranquilo"',
      "Quejarse con el propietario si otros inquilinos lo molestan",
      "Suspender el pago del alquiler si el propietario no cumple con sus obligaciones de mantenimiento",
    ],
  },
  {
    title: "Obligaciones del inquilino",
    items: [
      "Pagar la renta y otros gastos pactados en tiempo y forma",
      "Cuidar y mantener el inmueble",
      "Permitir el acceso al propietario para reparaciones",
      "No realizar obras sin consentimiento",
      "Respetar las normas de la comunidad",
      "Devolver el inmueble en buen estado",
      "Responder por los daños en el inmueble cuando son causados por él mismo, familiares o sus visitas",
    ],
  },
  {
    title: "Plazos del contrato",
    items: [
      "El plazo máximo de contrato es de 20 años para viviendas y 50 años para locales comerciales",
    ],
  },
];

export const reglasContenido: Record<TipoRegla, ReglaContenido> = {
  "residente-permanente": {
    title: "Residente Permanente",
    file: "ResidentesPermanentes.pdf",
    sections: SECCIONES_BASE,
    downloadable: true,
  },
  "huesped-temporal": {
    title: "Huéspedes Temporales",
    file: "ResidentesTemporales.pdf",
    sections: SECCIONES_BASE,
    downloadable: true,
  },
  "guardia-seguridad": {
    title: "Guardia de Seguridad",
    file: "GuardiaSeguridad.pdf",
    downloadable: true,
    sections: [
      {
        title: "Funciones del Guardia",
        items: [
          "Controlar el ingreso y salida de personas y vehículos",
          "Verificar la identidad de visitantes y residentes",
          "Reportar cualquier incidente de seguridad al administrador",
          "Mantener el orden en áreas comunes",
          "Cumplir con los horarios de turno establecidos",
        ],
      },
      {
        title: "Normas de conducta",
        items: [
          "Mantener una actitud profesional y respetuosa",
          "Usar el uniforme reglamentario durante el turno",
          "No consumir alimentos en el puesto de vigilancia",
          "Mantener la garita limpia y ordenada",
        ],
      },
    ],
  },
};
