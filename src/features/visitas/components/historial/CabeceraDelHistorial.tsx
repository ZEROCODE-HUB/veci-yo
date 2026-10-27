import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";
import { VerificacionesConsumo } from "../VerificacionesConsumo";
import type { useVisitasHistorial } from "../../hooks";
import type { useVisitasPermisos } from "../../hooks/useVisitasPermisos";
import { AvisoSinRentaCorta } from "./AvisoSinRentaCorta";
import { AccesosRapidosDeVisita } from "./AccesosRapidosDeVisita";
import { ListaOCalendario } from "./ListaOCalendario";
import { FiltrosDelHistorial } from "./FiltrosDelHistorial";

interface Props {
  permisos: ReturnType<typeof useVisitasPermisos>;
  historial: ReturnType<typeof useVisitasHistorial>;
  onElegirTipo: (tipo: VisitaItem["tipo"]) => void;
  /** El consumo del paquete de verificaciones, en la pestaña de huéspedes. */
  verificaciones: React.ComponentProps<typeof VerificacionesConsumo>;
}

/**
 * Lo que va encima de la lista de visitas: avisos, accesos rápidos, pestañas,
 * lista o calendario, filtros y el consumo de verificaciones.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 */
export function CabeceraDelHistorial({ permisos: p, historial, onElegirTipo, verificaciones }: Props) {
  const { tipoTab, setTipoTab, vistaSub, setVistaSub } = historial;
  return (
    <View className="gap-2.5">
      {!p.huespedDisponible && <AvisoSinRentaCorta />}

      {p.huespedSinPermisoDeVisitas ? (
        <Text className="text-sm text-gray-500">
          Tu anfitrión no permite registrar visitas durante tu estancia.
        </Text>
      ) : null}

      {p.puedeCrear && (
        <AccesosRapidosDeVisita
          tipos={p.tiposDisponibles}
          huespedDisponible={p.huespedDisponible}
          onElegir={onElegirTipo}
        />
      )}

      {/*
        Visitas / Huéspedes. Al huésped temporal le salía **una sola pestaña**:
        se pintaba «Visitas», se pulsaba «Visitas», y seguía en «Visitas». Una
        barra de una pestaña no puede hacer nada.
      */}
      {p.mostrarTipoTabs && (
        <Tabs
          tabs={p.tipoTabs}
          active={tipoTab}
          onChange={(v) => setTipoTab(v || p.tipoTabs[0].value)}
          centered
        />
      )}

      {!p.sinCalendario && <ListaOCalendario valor={vistaSub} onChange={setVistaSub} />}

      {vistaSub === "lista" && (
        <FiltrosDelHistorial
          historial={historial}
          puedeFiltrarTorrePiso={p.puedeFiltrarTorrePiso}
        />
      )}

      {/*
        Se dice, para que una lista corta no parezca un fallo: desde el
        09/10/2026 la base solo le entrega esto a la porteria.
      */}
      {p.esGuardia && (
        <Text className="text-xs text-gray-500">
          La portería ve las visitas de hoy, las de mañana y a quien sigue dentro.
        </Text>
      )}

      {tipoTab === "huespedes" && !p.esGuardia && <VerificacionesConsumo {...verificaciones} />}
    </View>
  );
}
