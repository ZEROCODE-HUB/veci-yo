import React from "react";
import { Linking } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { ReservaGuardiaDetail } from "../ReservaGuardiaDetail";
import { ReservaPropietarioDetail } from "../ReservaPropietarioDetail";
import { ReservaAdministradorDetail } from "../ReservaAdministradorDetail";
import type { useVisitas } from "../../hooks";
import { uuidInvitado } from "../../helpers/uuidInvitado";

interface Props {
  item: VisitaItem;
  visitas: ReturnType<typeof useVisitas>;
  esGuardia: boolean;
  /** Propietario o inquilino líder: quien responde por la estancia. */
  esAnfitrion: boolean;
  exigeDocumento: boolean;
  lugaresDisponibles: number;
  onBack: () => void;
  onAsignarEstacionamiento: () => void;
}

/**
 * El detalle de una estancia (o de una visita de varias personas, en la
 * portería), según quién lo mira: la portería registra entradas y salidas, el
 * anfitrión gestiona a sus huéspedes y la administración solo mira.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026 para partir una pantalla de
 * mil líneas; hace lo mismo que hacía allí.
 */
export function DetalleDeEstancia({
  item,
  visitas,
  esGuardia,
  esAnfitrion,
  exigeDocumento,
  lugaresDisponibles,
  onBack,
  onAsignarEstacionamiento,
}: Props) {
  const uuid = item.uuid ?? "";

  if (esGuardia) {
    return (
      <ReservaGuardiaDetail
        item={item}
        exigeDocumento={exigeDocumento}
        onBack={onBack}
        onAssignParking={onAsignarEstacionamiento}
        onToggleInstruction={() =>
          visitas.registrarAnuncio(uuid, !item.instruccionesCumplidas?.llamoAnuncie)
        }
        onCallAnnounce={() => {
          if (item.telefonoResidente) {
            Linking.openURL(`tel:${item.telefonoResidente}`);
          }
        }}
        onUpdateEntryNotes={(notes) =>
          visitas.actualizarVisita(uuid, { anotacionesIngreso: notes })
        }
        onUpdateExitNotes={(notes) =>
          visitas.actualizarVisita(uuid, { anotacionesSalida: notes })
        }
        onAddEntryPhotos={(photos) => visitas.adjuntarFotosVisita(uuid, photos, "ingreso")}
        onAddExitPhotos={(photos) => visitas.adjuntarFotosVisita(uuid, photos, "salida")}
        onToggleArrival={(guestIndex, arrived) =>
          visitas.marcarLlegadaInvitado(
            uuidInvitado(item, guestIndex),
            arrived,
            // La visita, para poder avisar si un huesped llega fuera del
            // horario de check-in de su vivienda.
            item,
          )
        }
        onVerifyDocument={(guestIndex, numero) =>
          visitas.verificarEnPorteria(uuidInvitado(item, guestIndex), numero)
        }
        onPhotoDocument={(guestIndex, uri) =>
          visitas.subirFotoDePorteria(uuidInvitado(item, guestIndex), uri)
        }
        onUpdateArrivalTime={(guestIndex, time) =>
          visitas.registrarHoraInvitado(uuidInvitado(item, guestIndex), "ingreso", time)
        }
        onUpdateDepartureTime={(guestIndex, time) =>
          visitas.registrarHoraInvitado(uuidInvitado(item, guestIndex), "salida", time)
        }
        lugaresDisponibles={lugaresDisponibles}
      />
    );
  }

  if (esAnfitrion) {
    return (
      <ReservaPropietarioDetail
        item={item}
        onBack={onBack}
        onUpdateInvitado={(index, patch) =>
          visitas.actualizarInvitado(uuidInvitado(item, index), patch)
        }
        onReportTraSire={(invitadoUuid, movimiento) =>
          visitas.reportarTraSire(invitadoUuid, movimiento)
        }
        onAcceptTerms={(invitadoUuid) => visitas.aceptarTerminos(invitadoUuid, true)}
        onResolverRevision={visitas.resolverRevision}
        onAbrirInforme={visitas.abrirInformeAntecedentes}
        onReintentarVerificacion={visitas.reintentarVerificacion}
        onCambiarFechas={(desde, hasta) =>
          visitas.cambiarFechasDeEstancia({ visitaUuid: uuid, desde, hasta })
        }
        onCambiarExtras={(cambios) => visitas.actualizarVisitaAsync(uuid, cambios)}
        editandoEstancia={visitas.editandoEstancia}
        onCambiarCuantos={(previstas, menores) =>
          visitas.actualizarVisita(uuid, {
            huespedesPrevistos: previstas,
            menoresPrevistos: menores,
          })
        }
      />
    );
  }

  return <ReservaAdministradorDetail item={item} onBack={onBack} />;
}
