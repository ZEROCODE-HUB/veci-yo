import React from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  obtenerMisInvitacionesDeTrabajador,
  responderInvitacionDeTrabajador,
} from "@/features/propietario/services/trabajadores.repo";

const CLAVE = ["mis-invitaciones", "trabajador"];

/**
 * La invitación a la app como trabajador permanente de una vivienda
 * (17/11/2026): la ve quien entró con el correo al que se la mandaron, y se
 * acepta con un toque, como las de la vivienda. Al aceptar le suena el
 * intercomunicador de esa vivienda y nada más. Rechazarla no lo saca del
 * directorio: sigue ahí, sin app.
 */
export function InvitacionDeTrabajador() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const refrescarContexto = useAuthStore((s) => s.refrescarContexto);
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const invitaciones = useQuery({
    queryKey: CLAVE,
    queryFn: obtenerMisInvitacionesDeTrabajador,
    enabled: autenticado,
  });

  const responder = useMutation({
    mutationFn: (datos: { id: string; acepta: boolean }) =>
      responderInvitacionDeTrabajador(datos.id, datos.acepta),
    onSuccess: async (_r, datos) => {
      await client.invalidateQueries({ queryKey: CLAVE });
      if (datos.acepta) {
        addToast("Invitación aceptada: ya contestas el intercomunicador de la vivienda", "success");
        await refrescarContexto();
      } else {
        addToast("Invitación rechazada", "info");
      }
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo responder la invitación"), "error"),
  });

  const lista = invitaciones.data ?? [];
  if (lista.length === 0) return null;

  return (
    <View className="gap-2 px-4 pt-4">
      {lista.map((inv) => {
        const ocupado = responder.isPending && responder.variables?.id === inv.id;
        return (
          <View
            key={inv.id}
            className="gap-2 rounded-2xl p-3"
            style={{ backgroundColor: theme.colors.warningSoft }}
          >
            <Text className="text-sm font-semibold" style={{ color: theme.colors.badgeAmberText }}>
              {`Te invitaron como trabajador permanente de Torre ${inv.torre} · Depto ${inv.unidad}, ${inv.edificio}.`}
            </Text>
            <Text className="text-xs" style={{ color: theme.colors.badgeAmberText }}>
              {inv.invitadaPor
                ? `Te invitó ${inv.invitadaPor}. Podrás contestar el intercomunicador de la vivienda.`
                : "Podrás contestar el intercomunicador de la vivienda."}
            </Text>
            <View className="flex-row gap-2">
              <Button
                size="sm"
                loading={ocupado && responder.variables?.acepta === true}
                disabled={responder.isPending}
                onPress={() => responder.mutate({ id: inv.id, acepta: true })}
              >
                Aceptar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={ocupado && responder.variables?.acepta === false}
                disabled={responder.isPending}
                onPress={() => responder.mutate({ id: inv.id, acepta: false })}
              >
                Rechazar
              </Button>
            </View>
          </View>
        );
      })}
    </View>
  );
}
