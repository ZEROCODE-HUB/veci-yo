import React, { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Checkbox, Modal } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  obtenerMisInvitaciones,
  responderEspacio,
  responderInvitacion,
  type MiInvitacion,
} from "../services/misInvitaciones.repo";

const CLAVE = ["mis-invitaciones"];

/**
 * El aviso de Inicio de que alguien recibió una invitación a una vivienda, y
 * los pasos para aceptarla (Para Claude 183, 30/10/2026).
 *
 * Primero la vivienda, con sus términos. Después, si la vivienda tiene
 * estacionamientos o depósitos, cada uno aparte con los suyos: solo quedan si
 * se aceptan. El proceso termina cuando no queda nada por responder.
 */
export function InvitacionesPendientes() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const refrescarContexto = useAuthStore((s) => s.refrescarContexto);
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const invitaciones = useQuery({
    queryKey: CLAVE,
    queryFn: obtenerMisInvitaciones,
    enabled: autenticado,
  });
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  const lista = invitaciones.data ?? [];
  const actual = lista.find((i) => i.id === abierta) ?? null;
  // Lo que toca responder ahora: la vivienda, o el primer espacio pendiente.
  const espacio = actual?.aceptada
    ? (actual.espacios.find((e) => e.estado === "pendiente") ?? null)
    : null;

  const alTerminar = async () => {
    setAceptoTerminos(false);
    await client.invalidateQueries({ queryKey: CLAVE });
    const nuevas = client.getQueryData<MiInvitacion[]>(CLAVE) ?? [];
    if (!nuevas.some((i) => i.id === abierta)) setAbierta(null);
    await refrescarContexto();
  };

  const vivienda = useMutation({
    mutationFn: (acepta: boolean) => responderInvitacion(abierta ?? "", acepta),
    onSuccess: alTerminar,
    onError: (e) => addToast(mensajeDeError(e, "No se pudo responder la invitación"), "error"),
  });
  const delEspacio = useMutation({
    mutationFn: (acepta: boolean) => responderEspacio(espacio?.id ?? "", acepta),
    onSuccess: alTerminar,
    onError: (e) => addToast(mensajeDeError(e, "No se pudo responder"), "error"),
  });

  if (lista.length === 0) return null;

  const ocupado = vivienda.isPending || delEspacio.isPending;
  const nombreDelEspacio = espacio
    ? `${espacio.tipo === "estacionamiento" ? "Estacionamiento" : "Depósito"} ${espacio.codigo ?? ""}`.trim()
    : "";

  return (
    <View className="gap-2 px-4 pt-4">
      {lista.map((inv) => (
        <View
          key={inv.id}
          className="flex-row items-center gap-3 rounded-2xl p-3"
          style={{ backgroundColor: theme.colors.warningSoft }}
        >
          <Text className="flex-1 text-sm" style={{ color: theme.colors.badgeAmberText }}>
            {inv.aceptada
              ? `Te falta responder lo que va con Torre ${inv.torre} · Depto ${inv.unidad}.`
              : `Recibiste una invitación a una propiedad: Torre ${inv.torre} · Depto ${inv.unidad}, ${inv.edificio}.`}
          </Text>
          <Button
            size="sm"
            onPress={() => {
              setAceptoTerminos(false);
              setAbierta(inv.id);
            }}
          >
            Ver
          </Button>
        </View>
      ))}

      <Modal
        visible={Boolean(actual)}
        onClose={() => setAbierta(null)}
        title={espacio ? nombreDelEspacio : "Invitación a una propiedad"}
      >
        {actual && !actual.aceptada ? (
          <View className="gap-3">
            <Text className="text-sm text-gray-900">
              {`Edificio: ${actual.edificio}\nTorre ${actual.torre} · Depto ${actual.unidad}`}
            </Text>
            {actual.invitadaPor ? (
              <Text className="text-xs text-gray-500">{`Te invitó: ${actual.invitadaPor}`}</Text>
            ) : null}
            {actual.espacios.length > 0 ? (
              <Text className="text-xs text-gray-500">
                {`Va con ${actual.espacios.length} ${actual.espacios.length === 1 ? "espacio" : "espacios"} (estacionamiento o depósito) que aceptarás aparte.`}
              </Text>
            ) : null}
            <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.bgMuted }}>
              <Text className="text-xs text-gray-700">{actual.terminos ?? ""}</Text>
            </View>
            <Checkbox
              checked={aceptoTerminos}
              onChange={setAceptoTerminos}
              label="Acepto los términos y condiciones"
            />
            <Button
              fullWidth
              disabled={!aceptoTerminos || ocupado}
              loading={vivienda.isPending}
              onPress={() => vivienda.mutate(true)}
            >
              Aceptar la invitación
            </Button>
            <Button variant="secondary" fullWidth disabled={ocupado} onPress={() => vivienda.mutate(false)}>
              No es mía, rechazar
            </Button>
          </View>
        ) : null}

        {actual && espacio ? (
          <View className="gap-3">
            <Text className="text-sm text-gray-900">
              {`${nombreDelEspacio}${espacio.ubicacion ? ` · ${espacio.ubicacion}` : ""}\nDe Torre ${actual.torre} · Depto ${actual.unidad}`}
            </Text>
            <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.bgMuted }}>
              <Text className="text-xs text-gray-700">{espacio.terminos ?? ""}</Text>
            </View>
            <Checkbox
              checked={aceptoTerminos}
              onChange={setAceptoTerminos}
              label="Acepto los términos y condiciones"
            />
            <Button
              fullWidth
              disabled={!aceptoTerminos || ocupado}
              loading={delEspacio.isPending}
              onPress={() => delEspacio.mutate(true)}
            >
              Aceptar
            </Button>
            <Button variant="secondary" fullWidth disabled={ocupado} onPress={() => delEspacio.mutate(false)}>
              No lo acepto
            </Button>
            <Text className="text-xs text-gray-500">Si no lo aceptas, no queda asignado a tu vivienda.</Text>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
