import React from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  obtenerMisInvitacionesDelEdificio,
  responderInvitacionDelEdificio,
} from "../services/misInvitaciones.repo";

const CLAVE = ["mis-invitaciones", "edificio"];

const ROL: Record<string, string> = {
  guardia: "guardia de portería",
  coadministrador: "coadministración",
  administrador: "administración",
};

/**
 * Las invitaciones del edificio --guardia, coadministración, administración--
 * se aceptan aquí (13/11/2026, cliente: «me creé la cuenta con ese correo,
 * entré a la app y no me sale la invitación para aceptar el rol de guardia»).
 * Al aceptarla, la app se recarga con el rol nuevo.
 */
export function InvitacionesDelEdificio() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const refrescarContexto = useAuthStore((s) => s.refrescarContexto);
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const invitaciones = useQuery({
    queryKey: CLAVE,
    queryFn: obtenerMisInvitacionesDelEdificio,
    enabled: autenticado,
  });

  const responder = useMutation({
    mutationFn: (datos: { id: string; acepta: boolean }) =>
      responderInvitacionDelEdificio(datos.id, datos.acepta),
    onSuccess: async (_r, datos) => {
      await client.invalidateQueries({ queryKey: CLAVE });
      if (datos.acepta) {
        addToast("Invitación aceptada: ya tienes el rol nuevo", "success");
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
              {`Te invitaron como ${ROL[inv.rol] ?? inv.rol} en ${inv.edificio}.`}
            </Text>
            {inv.invitadaPor ? (
              <Text className="text-xs" style={{ color: theme.colors.badgeAmberText }}>
                {`Te invitó ${inv.invitadaPor}.`}
              </Text>
            ) : null}
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
