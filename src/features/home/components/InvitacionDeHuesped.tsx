import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { formatDateIso } from "@/shared/utils/date.util";
import { plural } from "@/shared/utils/plural.util";
import {
  aceptarMiInvitacionDeHuesped,
  obtenerMisInvitacionesDeHuesped,
  type MiInvitacionDeHuesped,
} from "../services/misInvitaciones.repo";

const CLAVE = ["mis-invitaciones", "huesped"];

/**
 * La invitación de huésped temporal que espera a quien entra (Para Claude 224,
 * 04/11/2026).
 *
 * Quien terminaba el preregistro e iniciaba sesión o creaba su cuenta en la
 * app la encontraba vacía: la invitación solo se aceptaba abriendo el enlace
 * con el token. Ahora la base la encuentra por su correo y aquí se ve, con los
 * datos de la reserva y «Aceptar invitación». Si todavía no tiene ningún rol
 * --la app estaría vacía--, la ventana se abre sola al entrar.
 */
export function InvitacionDeHuesped() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const sinRol = useAuthStore((s) => s.rolActivo === null);
  const refrescarContexto = useAuthStore((s) => s.refrescarContexto);
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const invitaciones = useQuery({
    queryKey: CLAVE,
    queryFn: obtenerMisInvitacionesDeHuesped,
    enabled: autenticado,
  });
  const [abierta, setAbierta] = useState<string | null>(null);

  const lista = invitaciones.data ?? [];
  const actual = lista.find((i) => i.id === abierta) ?? null;

  // Una sola vez: si la cierra, se queda el aviso con «Ver».
  const yaSeAbrio = useRef(false);
  const primera = lista[0]?.id ?? null;
  useEffect(() => {
    if (sinRol && primera && !yaSeAbrio.current) {
      yaSeAbrio.current = true;
      setAbierta(primera);
    }
  }, [sinRol, primera]);

  const aceptar = useMutation({
    mutationFn: (id: string) => aceptarMiInvitacionDeHuesped(id),
    onSuccess: async () => {
      setAbierta(null);
      await client.invalidateQueries({ queryKey: ["mis-invitaciones"] });
      // Entra solo al rol de huésped y se carga su reserva.
      await refrescarContexto();
      addToast("¡Listo! Ya puedes ver tu reserva", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo aceptar la invitación"), "error"),
  });

  if (lista.length === 0) return null;

  return (
    <View className="gap-2 px-4 pt-4">
      {lista.map((inv) => (
        <View
          key={inv.id}
          className="flex-row items-center gap-3 rounded-2xl p-3"
          style={{ backgroundColor: theme.colors.warningSoft }}
        >
          <Text className="flex-1 text-sm" style={{ color: theme.colors.badgeAmberText }}>
            {`Tienes una invitación pendiente como huésped: Torre ${inv.torre} · Depto ${inv.unidad}, ${inv.edificio}.`}
          </Text>
          <Button size="sm" onPress={() => setAbierta(inv.id)}>
            Ver
          </Button>
        </View>
      ))}

      <Modal
        visible={Boolean(actual)}
        onClose={() => setAbierta(null)}
        title="Tu invitación como huésped"
      >
        {actual ? (
          <View className="gap-3">
            <Text className="text-sm text-gray-500">
              Revisa los datos de tu reserva y acepta la invitación para verla en la app.
            </Text>
            <View
              className="gap-2.5 rounded-xl p-3"
              style={{ backgroundColor: theme.colors.bgMuted }}
            >
              {datosDeLaReserva(actual).map(([etiqueta, valor]) => (
                <View key={etiqueta} className="flex-row justify-between gap-3">
                  <Text className="text-sm text-gray-500">{etiqueta}</Text>
                  <Text className="flex-1 text-right text-sm font-semibold text-gray-900">
                    {valor}
                  </Text>
                </View>
              ))}
            </View>
            <Button
              fullWidth
              loading={aceptar.isPending}
              disabled={aceptar.isPending}
              onPress={() => aceptar.mutate(actual.id)}
            >
              Aceptar invitación
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={aceptar.isPending}
              onPress={() => setAbierta(null)}
            >
              Ahora no
            </Button>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

/** Las filas de la reserva; lo que la base no trae, no se pinta. */
function datosDeLaReserva(inv: MiInvitacionDeHuesped): [string, string][] {
  const filas: [string, string][] = [
    ["Edificio", inv.edificio],
    ["Vivienda", `Torre ${inv.torre} · Depto ${inv.unidad}`],
  ];
  if (inv.anfitrion) filas.push(["Anfitrión", inv.anfitrion]);
  if (inv.entrada) filas.push(["Entrada", formatDateIso(inv.entrada)]);
  if (inv.salida) filas.push(["Salida", formatDateIso(inv.salida)]);
  if (inv.horaLlegada) filas.push(["Hora de llegada", inv.horaLlegada.slice(0, 5)]);
  if (inv.horaSalida) filas.push(["Hora de salida", inv.horaSalida.slice(0, 5)]);
  if (inv.huespedes > 0) filas.push(["Huéspedes", plural(inv.huespedes, "persona")]);
  if (inv.vehiculos) filas.push(["Vehículos", String(inv.vehiculos)]);
  if (inv.codigoReserva) filas.push(["Código de reserva", inv.codigoReserva]);
  return filas;
}
