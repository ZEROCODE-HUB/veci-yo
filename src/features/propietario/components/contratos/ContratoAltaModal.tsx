import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input, Modal, Select, Toggle } from "@/shared/components";
import { formatDate } from "@/shared/utils";

/**
 * Registrar un contrato de arrendamiento.
 *
 * Estos campos los pedía `PropietarioCrearRol` y los escribía en un store de
 * Zustand, mezclados con el alta de la persona. Son dos cosas distintas: dar
 * de alta a alguien en una vivienda es una invitación, y el contrato se firma
 * con quien ya está. Por eso se piden aquí, en la pantalla del contrato.
 *
 * La moneda no se pide: la pone el condominio, que es quien sabe en qué cobra.
 */
export function ContratoAltaModal({
  visible,
  candidatos,
  guardando,
  onGuardar,
  onClose,
}: {
  visible: boolean;
  /** Las personas de la vivienda que pueden figurar como inquilinos. */
  candidatos: Array<{ id: string; nombre: string; rol: string }>;
  guardando: boolean;
  onGuardar: (datos: {
    membresiaId: string | null;
    fechaInicio: string;
    duracionMeses: number | null;
    monto: number | null;
    monitoreaPago: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [membresiaId, setMembresiaId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(formatDate(new Date()));
  const [duracion, setDuracion] = useState("12");
  const [monto, setMonto] = useState("");
  const [monitorea, setMonitorea] = useState(false);

  const fechaValida = /^\d{2}\/\d{2}\/\d{4}$/.test(fechaInicio);
  const montoNumero = monto.trim() ? Number(monto.replace(/[^\d.]/g, "")) : null;
  const puedeGuardar =
    fechaValida && !guardando && (montoNumero === null || montoNumero >= 0);

  return (
    <Modal visible={visible} onClose={onClose} title="Registrar contrato">
      <View className="flex-col gap-3">
        <Select
          label="Inquilino"
          value={membresiaId}
          options={[
            { label: "Sin asignar", value: "" },
            ...candidatos.map((c) => ({
              label: `${c.nombre} · ${c.rol}`,
              value: c.id,
            })),
          ]}
          onChange={(valor) => setMembresiaId(String(valor))}
          placeholder="¿Con quién es el contrato?"
        />

        <Input
          label="Fecha de inicio"
          value={fechaInicio}
          onChangeText={setFechaInicio}
          placeholder="dd/mm/aaaa"
        />
        {!fechaValida && (
          <Text className="text-xs text-red-600">
            La fecha va en formato dd/mm/aaaa.
          </Text>
        )}

        <Input
          label="Duración (meses)"
          value={duracion}
          onChangeText={(v) => setDuracion(v.replace(/\D/g, ""))}
          placeholder="12"
        />

        <Input
          label="Monto del alquiler"
          value={monto}
          onChangeText={setMonto}
          placeholder="Sin monto"
        />

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-900">Monitorear el pago</Text>
          <Toggle value={monitorea} onChange={() => setMonitorea(!monitorea)} />
        </View>

        <Button
          variant="primary"
          fullWidth
          disabled={!puedeGuardar}
          onPress={() =>
            onGuardar({
              membresiaId: membresiaId || null,
              fechaInicio,
              duracionMeses: duracion ? Number(duracion) : null,
              monto: montoNumero,
              monitoreaPago: monitorea,
            })
          }
        >
          {guardando ? "Guardando…" : "Registrar contrato"}
        </Button>
      </View>
    </Modal>
  );
}
