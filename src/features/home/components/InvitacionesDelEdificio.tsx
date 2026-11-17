import React from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  obtenerMisInvitacionesDeLaVivienda,
  obtenerMisInvitacionesDelEdificio,
  responderInvitacionDeLaVivienda,
  responderInvitacionDelEdificio,
} from "../services/misInvitaciones.repo";

const CLAVE = ["mis-invitaciones", "edificio"];
const CLAVE_VIVIENDA = ["mis-invitaciones", "vivienda"];

const ROL: Record<string, string> = {
  guardia: "guardia de portería",
  coadministrador: "coadministración",
  administrador: "administración",
  inquilino_lider: "inquilino líder",
  residente: "residente",
  corresidente: "corresidente",
};

interface Pendiente {
  id: string;
  de: "edificio" | "vivienda";
  texto: string;
  invitadaPor: string | null;
}

/**
 * Las invitaciones que se aceptan con un toque, en Inicio.
 *
 *   · Las del edificio --guardia, coadministración, administración--
 *     (13/11/2026, cliente: «me creé la cuenta con ese correo, entré a la app
 *     y no me sale la invitación para aceptar el rol de guardia»).
 *   · Las de una vivienda --inquilino líder, residente, corresidente,
 *     coadministración de la vivienda-- (16/11/2026, al unificar las
 *     invitaciones): solo se aceptaban abriendo el enlace del correo.
 *
 * La del propietario y la del huésped tienen las suyas, porque llevan
 * términos, espacios o una reserva que revisar antes.
 * Al aceptar, la app se recarga con el rol nuevo.
 */
export function InvitacionesDelEdificio() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const refrescarContexto = useAuthStore((s) => s.refrescarContexto);
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const delEdificio = useQuery({
    queryKey: CLAVE,
    queryFn: obtenerMisInvitacionesDelEdificio,
    enabled: autenticado,
  });
  const deLaVivienda = useQuery({
    queryKey: CLAVE_VIVIENDA,
    queryFn: obtenerMisInvitacionesDeLaVivienda,
    enabled: autenticado,
  });

  const responder = useMutation({
    mutationFn: (datos: { id: string; de: Pendiente["de"]; acepta: boolean }) =>
      datos.de === "edificio"
        ? responderInvitacionDelEdificio(datos.id, datos.acepta)
        : responderInvitacionDeLaVivienda(datos.id, datos.acepta),
    onSuccess: async (_r, datos) => {
      await client.invalidateQueries({ queryKey: datos.de === "edificio" ? CLAVE : CLAVE_VIVIENDA });
      if (datos.acepta) {
        addToast("Invitación aceptada: ya tienes el rol nuevo", "success");
        await refrescarContexto();
      } else {
        addToast("Invitación rechazada", "info");
      }
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo responder la invitación"), "error"),
  });

  const lista: Pendiente[] = [
    ...(delEdificio.data ?? []).map((inv) => ({
      id: inv.id,
      de: "edificio" as const,
      texto: `Te invitaron como ${ROL[inv.rol] ?? inv.rol} en ${inv.edificio}.`,
      invitadaPor: inv.invitadaPor,
    })),
    ...(deLaVivienda.data ?? []).map((inv) => ({
      id: inv.id,
      de: "vivienda" as const,
      texto: `Te invitaron como ${ROL[inv.rol] ?? inv.rol} de Torre ${inv.torre} · Depto ${inv.unidad}, ${inv.edificio}.`,
      invitadaPor: inv.invitadaPor,
    })),
  ];
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
              {inv.texto}
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
                onPress={() => responder.mutate({ id: inv.id, de: inv.de, acepta: true })}
              >
                Aceptar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={ocupado && responder.variables?.acepta === false}
                disabled={responder.isPending}
                onPress={() => responder.mutate({ id: inv.id, de: inv.de, acepta: false })}
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
