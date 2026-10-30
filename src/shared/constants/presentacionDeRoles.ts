import type { Ionicons } from "@expo/vector-icons";
import type { RolActivo } from "@/shared/types";

/**
 * Cómo se presenta cada rol al elegirlo: en la pantalla de elegir rol y en el
 * selector de la barra de arriba (Para Claude 174, 30/10/2026).
 */
export const PRESENTACION_DE_ROL: Record<
  NonNullable<RolActivo>,
  { titulo: string; descripcion: string; icono: keyof typeof Ionicons.glyphMap }
> = {
  administrador: {
    titulo: "Administrador",
    descripcion: "Gestionar torres, unidades, zonas comunes y seguridad",
    icono: "business-outline",
  },
  guardia: {
    titulo: "Seguridad",
    descripcion: "Registrar visitas, correspondencia e ingresos",
    icono: "shield-checkmark-outline",
  },
  propietario: {
    titulo: "Propietario",
    descripcion: "Administrar tu vivienda y las personas que la habitan",
    icono: "home-outline",
  },
  "propietario-no-residente": {
    titulo: "Propietario no residente",
    descripcion: "Administrar tu vivienda sin vivir en ella",
    icono: "home-outline",
  },
  "propietario-sin-propiedades": {
    titulo: "Propietario",
    descripcion: "Todavía no tienes ninguna vivienda asignada",
    icono: "home-outline",
  },
  "inquilino-lider": {
    titulo: "Residente",
    descripcion: "Gestionar el día a día de tu vivienda",
    icono: "key-outline",
  },
  "huesped-temporal": {
    titulo: "Huésped temporal",
    descripcion: "Ver tu alojamiento durante tu estadía",
    icono: "bag-outline",
  },
  /*
    Operar la plataforma es un rol como los demás y se elige igual: quien además
    vive en un edificio tiene los dos y cambia cuando quiere. No es un permiso
    que se sume a otro, que es justo el error de la regla 8.
  */
  plataforma: {
    titulo: "Plataforma Veciyo",
    descripcion: "Dar de alta edificios y atender el soporte de la aplicación",
    icono: "globe-outline",
  },
};
