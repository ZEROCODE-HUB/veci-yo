import React from "react";
import { Linking } from "react-native";
import { formatTime } from "@/shared/utils";
import type { VisitaItem } from "@/shared/types";
import { VisitaGuardiaDetail } from "../VisitaGuardiaDetail";
import type { useVisitas } from "../../hooks";
import { uuidInvitado } from "../../helpers/uuidInvitado";

/**
 * La ficha de una visita para la portería: llegada, salida, documento, fotos y
 * anotaciones de una persona. La abre `FichaDeVisita`.
 */
export function FichaDeLaPorteria({
  item,
  personIndex,
  visitas,
  exigeDocumento,
  lugaresDisponibles,
  onAsignarEstacionamiento,
}: {
  item: VisitaItem;
  personIndex: number | null;
  visitas: ReturnType<typeof useVisitas>;
  exigeDocumento: boolean;
  lugaresDisponibles: number;
  onAsignarEstacionamiento: () => void;
}) {
  const uuid = item.uuid ?? "";
  const invitado = uuidInvitado(item, personIndex ?? -1);
  return (
    <VisitaGuardiaDetail
      item={item}
      personIndex={personIndex}
      exigeDocumento={exigeDocumento}
      onToggleArrival={(arrived) => visitas.marcarLlegadaInvitado(invitado, arrived)}
      onToggleInstruction={() =>
        visitas.registrarAnuncio(uuid, !item.instruccionesCumplidas?.llamoAnuncie)
      }
      onVerifyDocument={(numero) => visitas.verificarEnPorteria(invitado, numero)}
      onPhotoDocument={(uri) => visitas.subirFotoDePorteria(invitado, uri)}
      onUpdateArrivalTime={(time) => visitas.registrarHoraInvitado(invitado, "ingreso", time)}
      onUpdateDepartureTime={(time) => visitas.registrarHoraInvitado(invitado, "salida", time)}
      onToggleDeparture={(registered) =>
        visitas.registrarHoraInvitado(
          invitado,
          "salida",
          registered ? formatTime(new Date()) : "",
        )
      }
      onUpdateEntryNotes={(notes) => visitas.actualizarVisita(uuid, { anotacionesIngreso: notes })}
      onUpdateExitNotes={(notes) => visitas.actualizarVisita(uuid, { anotacionesSalida: notes })}
      onAddEntryPhotos={(photos) => visitas.adjuntarFotosVisita(uuid, photos, "ingreso")}
      onAddExitPhotos={(photos) => visitas.adjuntarFotosVisita(uuid, photos, "salida")}
      subiendoFotos={visitas.subiendoFotos}
      onCallAnnounce={() => {
        if (item.telefonoResidente) {
          Linking.openURL(`tel:${item.telefonoResidente}`);
        }
      }}
      lugaresDisponibles={lugaresDisponibles}
      onAssignParking={onAsignarEstacionamiento}
    />
  );
}
