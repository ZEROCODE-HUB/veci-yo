import React, { useEffect, useMemo, useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Cargando, Input, Modal } from "@/shared/components";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useCondominioActivo } from "@/shared/hooks";
import { supabase } from "@/shared/services/supabase";
import { ahora, formatDateInput } from "@/shared/utils";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { ReservaZona } from "@/shared/types";
import {
  obtenerReservas,
  resolverReserva,
  urlComprobante,
} from "../services/zonas.repo";

/** Lo que dura la lista: las de hoy y lo que viene. */
const CLAVE = ["zonas", "reservas-de-porteria"] as const;

/**
 * Las reservas de zonas comunes, vistas desde la portería (29/10/2026).
 *
 * El cliente: el guardia tiene que poder verlas --para la puerta: quién tiene
 * la piscina a las 4-- y, si la administración se lo permite (Seguridad ›
 * guardia › Editar › «Puede aprobar o rechazar reservas»), aprobarlas o
 * rechazarlas. En una zona de pago no se aprueba sin comprobante: la base lo
 * exige.
 *
 * 09/11/2026 (Correcciones filas 11 y 12): se llama «Aprobaciones de Zonas
 * Comunes», y el guardia ya no adjunta comprobantes: el pago es cosa de la
 * vivienda y de la administración.
 */
export function ReservasDePorteriaScreen() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const condominioActivo = useCondominioActivo();
  const condominios = useAuthStore((s) => s.condominios);
  const membresia =
    condominios.find((c) => c.rol === "guardia" && c.condominioId === condominioActivo) ??
    condominios.find((c) => c.rol === "guardia");
  const puedeAprobar = Boolean((membresia?.permisos as Record<string, unknown> | undefined)?.reservas);

  const reservas = useQuery({
    queryKey: CLAVE,
    queryFn: () => obtenerReservas({ ambito: "condominio", unidadIds: [] }),
    // Respaldo por si el aviso en vivo no llega.
    refetchInterval: 15_000,
  });

  /*
    Al momento (Para Claude 151 y 152, 29/10/2026): una reserva nueva o un
    comprobante subido desde otro celular aparecen sin salir de la lista.
  */
  useEffect(() => {
    const canal = supabase
      .channel("reservas-de-porteria")
      .on("postgres_changes", { event: "*", schema: "public", table: "reserva_zona" }, () => {
        void queryClient.invalidateQueries({ queryKey: CLAVE });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [queryClient]);

  const hoy = formatDateInput(ahora());
  const proximas = useMemo(
    () =>
      (reservas.data ?? [])
        .filter((r) => (r.fechaIso ?? "") >= hoy && r.estado !== "Cancelado")
        .sort((a, b) =>
          `${a.fechaIso}${a.horario}`.localeCompare(`${b.fechaIso}${b.horario}`),
        ),
    [reservas.data, hoy],
  );

  const refrescar = () => void queryClient.invalidateQueries({ queryKey: ["zonas"] });
  const resolver = useMutation({
    mutationFn: (d: { id: string; estado: "Aprobado" | "Rechazado"; motivo?: string }) =>
      resolverReserva(d.id, d.estado, d.motivo),
    onSuccess: (_r, d) => {
      refrescar();
      addToast(d.estado === "Aprobado" ? "Reserva aprobada" : "Reserva rechazada", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo resolver la reserva"), "error"),
  });
  const verComprobante = async (ruta: string) => {
    try {
      await Linking.openURL(await urlComprobante(ruta));
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo abrir el comprobante"), "error");
    }
  };

  const [porRechazar, setPorRechazar] = useState<ReservaZona | null>(null);
  const [motivo, setMotivo] = useState("");

  if (reservas.isLoading) return <Cargando texto="las reservas" />;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      refreshControl={<RefreshControl refreshing={reservas.isRefetching} onRefresh={() => void reservas.refetch()} />}
    >
      {/* Sin el texto de «adjunta el comprobante» (Correcciones fila 11). */}
      {puedeAprobar ? null : (
        <Text className="text-xs text-gray-500">
          Puedes ver las reservas. Aprobarlas o rechazarlas lo hace la administración (te lo puede habilitar en Seguridad).
        </Text>
      )}
      {reservas.isError ? (
        <Text className="text-sm text-danger">{mensajeDeError(reservas.error, "No se pudieron cargar las reservas")}</Text>
      ) : null}
      {proximas.length === 0 ? (
        <Text className="py-8 text-center text-sm text-gray-500">No hay reservas de hoy en adelante.</Text>
      ) : null}
      {proximas.map((r) => (
        <View key={r.uuid ?? r.id} className="gap-2 rounded-xl border border-gray-200 bg-white p-3">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-sm font-bold text-gray-900">{`${r.nombre} · ${r.fecha ?? ""}`}</Text>
            <Badge status={r.estado}>{r.estado}</Badge>
          </View>
          <Text className="text-sm text-gray-700">
            {[
              r.horario,
              r.depto ? `Depto ${r.depto}` : null,
              r.numeroRecurso ? `N°${r.numeroRecurso}` : null,
              `${(r.acompanantes ?? 0) + 1} ${(r.acompanantes ?? 0) === 0 ? "persona" : "personas"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {r.solicitante ? <Text className="text-xs text-gray-500">{`Reservó: ${r.solicitante}`}</Text> : null}
          <View className="flex-row flex-wrap gap-2">
            {r.comprobante ? (
              <Button size="sm" variant="secondary" onPress={() => void verComprobante(r.comprobante ?? "")}>
                Ver comprobante
              </Button>
            ) : null}
            {puedeAprobar && r.estado === "Pendiente" && r.uuid ? (
              <>
                <Button
                  size="sm"
                  loading={resolver.isPending && resolver.variables?.id === r.uuid}
                  onPress={() => resolver.mutate({ id: r.uuid ?? "", estado: "Aprobado" })}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onPress={() => {
                    setMotivo("");
                    setPorRechazar(r);
                  }}
                >
                  Rechazar
                </Button>
              </>
            ) : null}
          </View>
        </View>
      ))}

      <Modal visible={Boolean(porRechazar)} onClose={() => setPorRechazar(null)} title="Rechazar reserva">
        <View className="gap-3">
          <Input label="Motivo *" value={motivo} onChangeText={setMotivo} placeholder="Ej: el comprobante no corresponde" />
          <Button
            variant="danger"
            fullWidth
            disabled={!motivo.trim()}
            onPress={() => {
              if (porRechazar?.uuid) {
                resolver.mutate({ id: porRechazar.uuid, estado: "Rechazado", motivo: motivo.trim() });
              }
              setPorRechazar(null);
            }}
          >
            Rechazar
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}
