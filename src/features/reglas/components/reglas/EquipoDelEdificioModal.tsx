import React from "react";
import { Linking, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Cargando, Modal } from "@/shared/components";
import { useCondominioActivo, useNavegacion } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils/error.util";
import { PERMISOS_COADMIN } from "@/features/administrador/types/coadministradores";
import { numeroParaMarcar } from "@/features/directorio/helpers/contactos";
import { obtenerEquipoDelEdificio, type MiembroDelEquipo } from "../../services/equipo.repo";

export type QueEquipo = "oficina" | "guardias";

interface Props {
  que: QueEquipo | null;
  onClose: () => void;
}

/** Los permisos de un coadministrador que tiene puestos; sin clave cuenta como puesto, como en la base. */
function permisosPuestos(miembro: MiembroDelEquipo): string[] {
  return PERMISOS_COADMIN.filter(([clave]) => miembro.permisos[clave] !== false).map(
    ([, etiqueta]) => etiqueta,
  );
}

/**
 * Los dos listados de «Gestión y Renta Corta» (Para Claude 190 y 191,
 * 30/10/2026): la oficina --administración y coadministradores, con sus
 * permisos-- y los guardias, con su horario. A un guardia se le puede llamar
 * o escribir solo si está de turno y tiene ese permiso puesto.
 */
export function EquipoDelEdificioModal({ que, onClose }: Props) {
  const condominioId = useCondominioActivo() ?? "";
  const navigation = useNavegacion();
  const equipo = useQuery({
    queryKey: ["equipo-del-edificio", condominioId],
    queryFn: () => obtenerEquipoDelEdificio(condominioId),
    enabled: Boolean(que) && Boolean(condominioId),
  });

  const lista = (equipo.data ?? []).filter((m) =>
    que === "guardias" ? m.rol === "guardia" : m.rol !== "guardia",
  );

  const llamar = (m: MiembroDelEquipo) => {
    if (!m.telefono) return;
    void Linking.openURL(`tel:${numeroParaMarcar(m.codigoPais, m.telefono).replace(/\s/g, "")}`);
  };

  return (
    <Modal
      visible={que !== null}
      onClose={onClose}
      title={que === "guardias" ? "Guardias" : "Directorio Oficina y Administración"}
    >
      {equipo.isLoading ? <Cargando variante="enLinea" texto="el equipo" /> : null}
      {equipo.isError ? (
        <Text className="text-sm text-gray-500">
          {mensajeDeError(equipo.error, "No se pudo cargar el equipo")}
        </Text>
      ) : null}
      {equipo.isSuccess && lista.length === 0 ? (
        <Text className="text-sm text-gray-500">
          {que === "guardias" ? "No hay guardias registrados." : "No hay nadie en la oficina."}
        </Text>
      ) : null}

      <View className="gap-3">
        {lista.map((m) => (
          <View
            key={m.membresiaId}
            className="gap-1 rounded-2xl p-3"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Text className="text-sm font-bold text-gray-900">{m.nombre}</Text>
            <Text className="text-xs text-gray-500">
              {m.rol === "administrador"
                ? "Administrador"
                : m.rol === "coadministrador"
                  ? "Coadministrador"
                  : m.deTurno
                    ? "Guardia · de turno ahora"
                    : "Guardia · fuera de turno"}
            </Text>
            {m.correo ? <Text className="text-xs text-gray-700">✉️ {m.correo}</Text> : null}
            {m.telefono ? (
              <Text className="text-xs text-gray-700">
                📞 {numeroParaMarcar(m.codigoPais, m.telefono)}
              </Text>
            ) : null}

            {m.rol === "administrador" ? (
              <Text className="text-xs text-gray-700">Permisos: todos</Text>
            ) : null}
            {m.rol === "coadministrador" ? (
              <Text className="text-xs text-gray-700">
                Permisos: {permisosPuestos(m).join(" · ") || "ninguno"}
              </Text>
            ) : null}

            {m.rol === "guardia" ? (
              <>
                <Text className="text-xs text-gray-700">
                  Horario: {m.horario ?? "sin horario puesto"}
                </Text>
                <View className="mt-1 flex-row flex-wrap gap-2">
                  {m.deTurno && m.recibeLlamadas && m.telefono ? (
                    <Button size="sm" variant="secondary" onPress={() => llamar(m)}>
                      Llamar
                    </Button>
                  ) : null}
                  {m.deTurno && m.recibeChat ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        onClose();
                        navigation.navigate("Chat");
                      }}
                    >
                      Chat
                    </Button>
                  ) : null}
                </View>
                {!m.deTurno ? (
                  <Text className="text-xs text-gray-500">
                    Fuera de su turno no se le puede llamar ni escribir.
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        ))}
      </View>
    </Modal>
  );
}
