import React from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, CampoHora, Modal, Select } from "@/shared/components";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { ReservaZona } from "@/shared/types";
import { actualizarReserva } from "../services/zonas.repo";

interface Props {
  reserva: ReservaZona | null;
  /** Cuántas personas caben en una reserva de esa zona, contando a quien reserva. 0 = sin tope aquí. */
  tope: number;
  onClose: () => void;
}

/**
 * El vecino edita su reserva (18/11/2026, pedido del cliente): con el límite
 * de reservas por delante ya no puede hacer otra, así que cambia la que
 * tiene --el horario y cuántas personas van--, hasta lo que permita la zona.
 * La base lo comprueba todo otra vez (horario, cupos, personas por reserva) y
 * lo anota en la bitácora.
 */
export function EditarMiReserva({ reserva, tope, onClose }: Props) {
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [desde, setDesde] = React.useState("");
  const [hasta, setHasta] = React.useState("");
  const [personas, setPersonas] = React.useState(1);

  React.useEffect(() => {
    if (!reserva) return;
    const [d, h] = String(reserva.horario ?? "").split(/\s*-\s*/);
    setDesde(d ?? "");
    setHasta(h ?? "");
    setPersonas((reserva.acompanantes ?? 0) + 1);
  }, [reserva]);

  const guardar = useMutation({
    mutationFn: () =>
      actualizarReserva(reserva?.uuid ?? "", {
        horaInicio: desde,
        horaFin: hasta,
        acompanantes: Math.max(personas - 1, 0),
      }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["zonas"] });
      addToast("Reserva actualizada", "success");
      onClose();
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo cambiar la reserva"), "error"),
  });

  const maximo = tope > 0 ? tope : Math.max(personas, 10);
  const opciones = Array.from({ length: maximo }, (_, i) => ({
    value: i + 1,
    label: i === 0 ? "Solo yo" : `${i + 1} personas, contigo`,
  }));
  const horarioMal = !desde || !hasta || desde >= hasta;

  return (
    <Modal visible={Boolean(reserva)} onClose={onClose} title="Editar mi reserva">
      <View className="gap-3">
        <Text className="text-sm text-gray-600">
          {reserva?.nombre} · {reserva?.fecha}
        </Text>
        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <CampoHora label="Desde" paso={30} value={desde} onChange={setDesde} />
          </View>
          <View className="flex-1">
            <CampoHora label="Hasta" paso={30} value={hasta} onChange={setHasta} />
          </View>
        </View>
        <Select
          label="¿Cuántas personas van?"
          value={personas}
          options={opciones}
          onChange={(v) => setPersonas(Number(v))}
        />
        {horarioMal ? <Text className="text-xs text-danger">La hora de fin tiene que ser después de la de inicio.</Text> : null}
        <Button fullWidth loading={guardar.isPending} disabled={horarioMal || guardar.isPending} onPress={() => guardar.mutate()}>
          Guardar cambios
        </Button>
      </View>
    </Modal>
  );
}
