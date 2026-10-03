import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { CampoHora } from "@/shared/components";

interface Props {
  esGuardia: boolean;
  /** La hora a la que la portería registra el ingreso, en `HH:mm`. */
  horaInicio: string;
  setHoraInicio: (v: string) => void;
}

/**
 * La hora de ingreso que anota la portería.
 *
 * Era la sección más larga del formulario: **cuatro horas** —la franja estimada
 * de llegada y, para el huésped temporal, la de salida— cada una con su selector
 * y su estado de apertura, y veintidós props solo para esto.
 *
 * Se quitaron las cuatro el 02/10/2026, por decisión del cliente. Dos motivos, y
 * el segundo es el que importa:
 *
 *   · **Las horas las pone el huésped**, en su preregistro, no el anfitrión al
 *     reservar. Y los topes de entrada y salida los fija el anfitrión una vez
 *     para su vivienda (`suscripcion_renta_corta.checkin_desde/hasta`), no en
 *     cada reserva.
 *   · **Para un residente no se guardaban.** `useVisitasNuevo` solo pasaba
 *     `horaEstimadaLlegada` a `crearVisita` cuando quien registraba era el
 *     guardia, y `horaEstimadaSalida` **no la pasaba nunca**. Se tecleaban
 *     cuatro horas y se tiraban las cuatro: otra vez la decisión viviendo en la
 *     pantalla y no en el dato.
 *
 * Queda la del guardia, que es otra cosa: es la hora **real** a la que alguien
 * entró por la puerta, y esa sí se guarda y la necesita la portería.
 *
 * Y queda con `CampoHora` y no con el selector nativo, que **en web devuelve
 * `null`**: el guardia pulsaba el campo y no se abría nada.
 */
export function HorariosVisita({
  esGuardia,
  horaInicio,
  setHoraInicio,
}: Props) {
  if (!esGuardia) return null;

  return (
    <View
      className="rounded-2xl p-4 gap-3"
      style={{
        backgroundColor: theme.colors.bgMuted,
        boxShadow: theme.shadows.card,
      }}
    >
      <CampoHora
        label="Hora de ingreso *"
        value={horaInicio}
        onChange={setHoraInicio}
        placeholder="Seleccionar hora"
        paso={5}
      />
      <Text className="text-xs text-gray-400">
        La salida se registra posteriormente desde el detalle del ingreso.
      </Text>
    </View>
  );
}
