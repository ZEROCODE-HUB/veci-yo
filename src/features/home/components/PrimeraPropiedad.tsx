import React from "react";
import { ModuloBloqueado } from "@/shared/components/ui/ModuloEstado";
import { ESTANCIA_TERMINADA, HELP } from "@/shared/content/helpContent";
import { useAuthStore } from "@/stores";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useNavegacion } from "@/shared/hooks";

/**
 * El inicio de quien todavía no tiene ninguna vivienda (QA 23/10/2026): en
 * lugar de reputación, gratitud y la actividad del día --que son de quien vive
 * en un edificio--, la invitación a registrar su primera propiedad, como en el
 * prototipo. Si su estancia ya terminó, se dice eso.
 */
export function PrimeraPropiedad() {
  const navigation = useNavegacion();
  const estanciaTerminada = useAuthStore((s) => s.estanciaTerminada);
  const bloqueo = estanciaTerminada ? ESTANCIA_TERMINADA : HELP.propiedades.bloqueo;
  return (
    <ModuloBloqueado
      titulo={bloqueo.titulo}
      descripcion={bloqueo.descripcion}
      motivo={bloqueo.motivo}
      accion={bloqueo.accion}
      onAgregar={
        estanciaTerminada
          ? undefined
          : () => navigateToRoute(navigation, "InquilinoLiderUbicacion")
      }
    />
  );
}
