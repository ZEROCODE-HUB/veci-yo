import { theme } from "@/config";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ConfirmacionEnLinea } from "@/shared/components";
import { formatDateIso } from "@/shared/utils";
import { ETIQUETA_ROL } from "../../hooks/useInvitarAUnidad";
import type { InvitacionPendiente } from "../../services/invitacionesUnidad.repo";

const etiquetaRol = (rol: string | null) =>
  ETIQUETA_ROL[rol as keyof typeof ETIQUETA_ROL] ?? rol ?? "";

/**
 * Las invitadas que todavía no han aceptado. Se pueden revocar, y antes se
 * pregunta: revocaba al primer toque (27/10/2026).
 */
export function InvitacionesPendientes({
  pendientes,
  onRevocar,
}: {
  pendientes: InvitacionPendiente[];
  onRevocar: (id: string) => void;
}) {
  const [porRevocar, setPorRevocar] = useState<string | null>(null);
  if (pendientes.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-base font-bold text-gray-900">
        Invitaciones sin aceptar
      </Text>

      {pendientes.map((invitacion) => (
        <View key={invitacion.id} className="gap-2">
          <View
            className="flex-row justify-between items-center rounded-xl p-3"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <View className="flex-1 pr-2">
              <Text className="text-sm font-bold text-gray-900">
                {invitacion.nombre || invitacion.correo}
              </Text>
              <Text
                className="text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                {invitacion.correo} · {etiquetaRol(invitacion.rol)}
                {invitacion.vigenteHasta
                  ? ` · estancia hasta el ${formatDateIso(invitacion.vigenteHasta)}`
                  : ""}
              </Text>
            </View>

            <Pressable onPress={() => setPorRevocar(invitacion.id)} hitSlop={8}>
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.danger }}
              >
                Revocar
              </Text>
            </Pressable>
          </View>
          {porRevocar === invitacion.id ? (
            <ConfirmacionEnLinea
              pregunta={`¿Revocar la invitación de ${invitacion.nombre || invitacion.correo}? Su enlace dejará de valer y no podrá entrar con él.`}
              confirmar="Sí, revocar"
              onCancelar={() => setPorRevocar(null)}
              onConfirmar={() => {
                setPorRevocar(null);
                onRevocar(invitacion.id);
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
