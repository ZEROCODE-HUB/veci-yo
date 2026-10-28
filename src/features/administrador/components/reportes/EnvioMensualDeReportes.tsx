import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { Select, Toggle } from "@/shared/components";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import {
  guardarEnvioMensual,
  obtenerEnvioMensual,
  type EnvioMensual,
} from "../../services/reportes.repo";

const DIAS = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `Día ${i + 1}` }));

/**
 * El envío automático de los reportes cada mes (hueco 7, 28/10/2026).
 *
 * Lo enciende la administración y elige el día (1 a 28: el 29, 30 y 31 no
 * existen todos los meses). Ese día llega por correo, en Excel, el mes
 * anterior entero de los tres reportes. A los coadministradores, solo los que
 * su permiso les deja ver. Lo manda la base con su tarea diaria.
 */
export function EnvioMensualDeReportes() {
  const condominioId = useCondominioActivo() ?? "";
  const cliente = useQueryClient();
  const { addToast } = useUIStore();

  const { data: envio } = useQuery({
    queryKey: ["envio-mensual-reportes", condominioId],
    queryFn: () => obtenerEnvioMensual(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (nuevo: EnvioMensual) => guardarEnvioMensual(condominioId, nuevo),
    onSuccess: (_r, nuevo) => {
      addToast(nuevo.activo ? "Envío mensual encendido" : "Envío mensual apagado", "success");
      cliente.invalidateQueries({ queryKey: ["envio-mensual-reportes", condominioId] });
    },
    onError: (e: Error) => addToast(e.message, "error"),
  });

  const listo = envio !== undefined && !guardar.isPending;

  return (
    <View className="gap-3">
      <Toggle
        value={Boolean(envio?.activo)}
        disabled={!listo}
        onChange={(activo) => envio && guardar.mutate({ ...envio, activo })}
        labelRight="Enviarme los reportes cada mes"
      />
      {envio?.activo ? (
        <Select
          label="Qué día del mes"
          value={envio.dia}
          options={DIAS}
          onChange={(valor) => listo && guardar.mutate({ ...envio, dia: Number(valor) })}
        />
      ) : null}
      <Text className="text-xs leading-5 text-gray-500">
        {envio?.activo
          ? `El día ${envio.dia} de cada mes llegan por correo, en Excel, los tres reportes del mes anterior a la administración y a los coadministradores (a cada uno, los que su permiso le deja ver).`
          : "Apagado: los reportes se descargan aquí cuando quieras."}
      </Text>
    </View>
  );
}
