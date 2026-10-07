import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import { formatDateIso } from "@/shared/utils";
import type { DepartamentoRentaCorta } from "../../types/reglas";

const ITEMS = [
  { key: "antirruido", icon: "🔇", label: "Dispositivo antirruido" },
  { key: "noFumar", icon: "🚭", label: "Señalética de no fumar" },
  { key: "sensor", icon: "🔥", label: "Sensor de incendio/gas/CO2" },
] as const;

/**
 * El equipamiento de una vivienda de renta corta.
 *
 * Son **tres estados y no dos**, que es todo el asunto de este modal
 * (REVISAR-A-OJO 174): «no lo tiene», «el anfitrión dice que lo tiene» y «el
 * edificio subió a comprobarlo». Antes eran dos --«Registrado» en verde y «No
 * registrado» en rojo-- y lo que el anfitrión declaraba se leía como
 * comprobado. A un huésped que lee «sensor de incendio» eso le importa.
 *
 * Y el verde se reserva para lo verificado. Si lo declarado saliera también en
 * verde, la distinción estaría escrita y no se vería, que es como no estar.
 */
export function ReglaCumplimientoModal({
  departamento,
  puedeVerificar,
  verificando,
  onVerificar,
  onClose,
}: {
  departamento: DepartamentoRentaCorta | null;
  /** Si quien mira es la administración del edificio. */
  puedeVerificar: boolean;
  verificando: boolean;
  onVerificar: (unidadId: string, verificada: boolean) => void;
  onClose: () => void;
}) {
  const verificada = !!departamento?.verificadaEn;
  const fecha = formatDateIso(departamento?.verificadaEn);

  return (
    <Modal
      visible={!!departamento}
      onClose={onClose}
      title="Equipamiento del departamento"
    >
      <View className="gap-3">
        <Text className="text-base font-bold text-gray-900">
          {departamento?.departamento}
        </Text>

        <View
          className={`rounded-xl p-3 ${verificada ? "bg-green-50" : "bg-amber-50"}`}
        >
          <Text
            className={`text-xs leading-5 ${verificada ? "text-green-800" : "text-amber-800"}`}
          >
            {verificada
              ? `Comprobado por el edificio el ${fecha}${
                  departamento?.verificadaPor
                    ? `, por ${departamento.verificadaPor}`
                    : ""
                }.`
              : "Lo declara el anfitrión. Nadie del edificio ha subido a comprobarlo todavía."}
          </Text>
        </View>

        {ITEMS.map((item) => {
          const declarado = !!departamento?.cumplimiento[item.key];
          return (
            <View
              key={item.key}
              className="flex-row items-center gap-2.5 rounded-xl bg-gray-50 p-3"
            >
              <Text className="text-lg">{item.icon}</Text>
              <Text className="flex-1 text-sm text-gray-900">{item.label}</Text>
              <Text
                className={`text-xs font-bold ${
                  !declarado
                    ? "text-gray-400"
                    : verificada
                      ? "text-green-600"
                      : "text-amber-600"
                }`}
              >
                {!declarado
                  ? "No lo tiene"
                  : verificada
                    ? "Comprobado"
                    : "Declarado"}
              </Text>
            </View>
          );
        })}

        {puedeVerificar ? (
          <View className="gap-2">
            <Button
              fullWidth
              variant={verificada ? "secondary" : "primary"}
              loading={verificando}
              onPress={() =>
                departamento && onVerificar(departamento.id, !verificada)
              }
            >
              {verificada
                ? "Retirar la comprobación"
                : "Confirmar que lo comprobé"}
            </Button>
            {/*
              Dicho antes de pulsar y no después: la constancia lleva el nombre
              de quien la deja, y es a quien se le va a preguntar si un huésped
              reclama.
            */}
            <Text className="text-[11px] leading-4 text-gray-500">
              {verificada
                ? "Quitarla deja la vivienda como declarada por el anfitrión."
                : "Quedará tu nombre y la fecha. Si el anfitrión cambia cualquiera de las tres casillas, la comprobación se borra sola."}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
