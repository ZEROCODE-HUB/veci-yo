import React from "react";
import { Modal } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";
import { FichaDeLaPorteria } from "./FichaDeLaPorteria";
import { VisitaDetailModal } from "../VisitaDetailModal";
import type { useVisitas } from "../../hooks";

interface Props {
  /** La visita abierta, o `null` con la ficha cerrada. */
  item: VisitaItem | null;
  /** La persona de la visita que se mira, o `null` para la visita entera. */
  personIndex: number | null;
  visitas: ReturnType<typeof useVisitas>;
  esGuardia: boolean;
  esAdmin: boolean;
  exigeDocumento: boolean;
  lugaresDisponibles: number;
  /** Los cupos de estacionamiento que ocupa la visita. */
  cuposAsignados: string[];
  onClose: () => void;
  /** Cierra la ficha y abre el modal de estacionamiento. */
  onAsignarEstacionamiento: (item: VisitaItem) => void;
}

/**
 * La ficha de una visita: la de la portería, que registra entradas, salidas y
 * documentos, o la de quien la registró.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026 para partir una pantalla de
 * mil líneas; hace lo mismo que hacía allí.
 */
export function FichaDeVisita({
  item,
  personIndex,
  visitas,
  esGuardia,
  esAdmin,
  exigeDocumento,
  lugaresDisponibles,
  cuposAsignados,
  onClose,
  onAsignarEstacionamiento,
}: Props) {
  const persona = personIndex !== null ? item?.invitados?.[personIndex] : undefined;
  const titulo = persona
    ? /*
        «Huésped» solo si lo es. La portería abría la ficha de una visita de
        amigos y leía «Huésped: Lucía Fernández»: en esta aplicación huésped es
        un rol de renta corta con sus propias reglas, y quien viene a cenar es
        un invitado.
      */
      `${item?.tipo === "huesped-temporal" ? "Huésped" : "Invitado"}: ${persona.nombre}`
    : item?.tipo === "huesped-temporal"
      ? `Reserva: ${item.reserva || ""}`
      : esGuardia
        ? item?.nombre || ""
        : `Visita: ${item?.fechaDesde || ""}`;

  return (
    <Modal visible={!!item} onClose={onClose} title={titulo}>
      {item ? (
        esGuardia ? (
          <FichaDeLaPorteria
            item={item}
            personIndex={personIndex}
            visitas={visitas}
            exigeDocumento={exigeDocumento}
            lugaresDisponibles={lugaresDisponibles}
            onAsignarEstacionamiento={() => onAsignarEstacionamiento(item)}
          />
        ) : (
          <VisitaDetailModal
            item={item}
            personIndex={personIndex}
            showAssignParking={esAdmin}
            onAssignParking={() => onAsignarEstacionamiento(item)}
            assignedSpots={cuposAsignados}
            onCambiarDias={(diasTrabajo) =>
              visitas.actualizarVisita(item.uuid ?? "", { diasTrabajo })
            }
          />
        )
      ) : null}
    </Modal>
  );
}
