import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  CampoFecha,
  Input,
  Modal,
  Select,
  Toggle,
} from "@/shared/components";
import { formatDateInput } from "@/shared/utils";
import { montoDesdeTexto } from "@/shared/utils/monto";

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
  // En ISO, elegida en un calendario: «31/02/2026» pasaba el formato y
  // reventaba en la base.
  const [fechaInicio, setFechaInicio] = useState(formatDateInput(new Date()));
  const [duracion, setDuracion] = useState("12");
  const [monto, setMonto] = useState("");
  const [monitorea, setMonitorea] = useState(false);

  // Cada vez que se abre, limpio: guardaba y al volver seguía lo de antes.
  useEffect(() => {
    if (!visible) return;
    setMembresiaId("");
    setFechaInicio(formatDateInput(new Date()));
    setDuracion("12");
    setMonto("");
    setMonitorea(false);
  }, [visible]);

  const montoNumero = montoDesdeTexto(monto);
  const meses = duracion ? Number(duracion) : null;

  /** Lo que falta, dicho: el botón se apagaba sin explicar nada. */
  const motivo = !fechaInicio
    ? "Elige la fecha de inicio."
    : meses !== null && (meses < 1 || meses > 600)
      ? "La duración va de 1 a 600 meses, o vacía si no tiene fin."
      : montoNumero !== null && Number.isNaN(montoNumero)
        ? "Revisa el monto: solo números, como 850.000."
        : "";
  const puedeGuardar = !motivo && !guardando;

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

        <CampoFecha
          label="Fecha de inicio"
          enLinea
          value={fechaInicio}
          onChange={setFechaInicio}
        />

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
          type="numeric"
        />

        <View className="flex-row items-center justify-between">
          <Text className="shrink text-sm text-gray-900">Monitorear el pago</Text>
          <Toggle value={monitorea} onChange={() => setMonitorea(!monitorea)} />
        </View>

        {motivo ? (
          <Text className="text-xs text-red-600">{motivo}</Text>
        ) : null}

        <Button
          variant="primary"
          fullWidth
          loading={guardando}
          disabled={!puedeGuardar}
          onPress={() =>
            onGuardar({
              membresiaId: membresiaId || null,
              fechaInicio,
              duracionMeses: meses,
              monto: montoNumero,
              monitoreaPago: monitorea,
            })
          }
        >
          Registrar contrato
        </Button>
      </View>
    </Modal>
  );
}
