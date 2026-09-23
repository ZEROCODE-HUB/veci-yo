import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import type { ReservaZona } from "@/shared/types";

/**
 * Una franja de la grilla horaria de una zona común.
 *
 * Pintaba **una insignia por cada reserva que solapa la franja**, y para quien
 * no es la administración todas dicen lo mismo: "Ocupado". Con las dos
 * reservas de los datos de prueba se veía bien; al recorrer la piscina con la
 * base real, la franja de las 10:00 mostraba **ciento veinte insignias
 * idénticas** y la pantalla se volvía inservible.
 *
 * No hace falta una base sucia para llegar ahí: una zona con treinta reservas
 * el mismo día hace lo mismo.
 *
 * Así que para un vecino la franja dice una sola cosa —está ocupada— y sus
 * propias reservas sí se listan, porque sobre esas puede actuar. La
 * administración y la portería siguen viendo cada una: es su trabajo.
 */

interface Props {
  hora: string;
  reservas: ReservaZona[];
  /** La administración y la portería gestionan; el resto solo mira. */
  esGestion: boolean;
  /** Reservas de otras viviendas que ocupan esta franja. */
  ajenas: number;
  /** Cupos que quedan libres; 0 es franja llena. */
  libres: number;
  /** Cuántas reservas caben a la vez en la zona. */
  cupos: number;
  onSeleccionar: (reserva: ReservaZona) => void;
  onReservar: () => void;
}

const colorDe = (estado: string) =>
  estado === "Aprobado"
    ? theme.colors.success
    : estado === "Pendiente"
      ? theme.colors.warning
      : theme.colors.textSecondary;

function Insignia({
  color,
  atenuada,
  titulo,
  horario,
  onPress,
}: {
  color: string;
  atenuada?: boolean;
  titulo: string;
  horario: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="mb-1 rounded-lg px-2 py-1.5"
      style={{
        backgroundColor: atenuada ? theme.colors.borderLight : `${color}18`,
        borderLeftWidth: 3,
        borderLeftColor: color,
        opacity: atenuada ? 0.5 : 1,
      }}
    >
      <Text className="text-xs font-semibold text-gray-900">{titulo}</Text>
      <Text className="mt-0.5 text-[10px] text-gray-500">{horario}</Text>
    </Pressable>
  );
}

export function FranjaHoraria({
  hora,
  reservas,
  esGestion,
  ajenas,
  libres,
  cupos,
  onSeleccionar,
  onReservar,
}: Props) {
  const propias = esGestion ? reservas : reservas.filter((r) => r.esMia);
  const vacia = propias.length === 0 && ajenas === 0;

  return (
    <View className="flex-row border-b border-gray-100">
      <Text className="w-14 py-2.5 pr-2 text-right text-xs font-medium text-gray-500">
        {hora}
      </Text>
      <View className="flex-1 min-h-[56px] justify-center border-l border-gray-100 px-2 py-1.5">
        {vacia ? (
          <Pressable
            onPress={onReservar}
            className="items-center rounded-lg border border-dashed border-gray-300 px-2 py-2"
          >
            <Text className="text-xs font-semibold text-green-600">
              + Reservar
            </Text>
          </Pressable>
        ) : (
          <>
            {propias.map((reserva) => (
              <Insignia
                key={reserva.id}
                color={colorDe(reserva.estado)}
                titulo={
                  esGestion
                    ? `${reserva.depto}${reserva.solicitante ? ` · ${reserva.solicitante}` : ""}`
                    : // `numero` es opcional y las reservas sembradas no lo
                      // tienen: decia "Reserva N°" y ahi se quedaba.
                      reserva.reservaNum
                      ? `Reserva N° ${reserva.reservaNum}`
                      : "Tu reserva"
                }
                horario={reserva.horario}
                onPress={() => onSeleccionar(reserva)}
              />
            ))}

            {/* Las de los demás no se enumeran: para quien mira son la misma
                cosa, "esta franja está ocupada". Y no salen de la tabla, que
                solo entrega las propias, sino de `ocupacion_zona()`. */}
            {!esGestion && ajenas > 0 && (
              <Insignia
                color={theme.colors.textSecondary}
                atenuada
                titulo="Ocupado"
                horario={
                  ajenas === 1 ? "Otra vivienda" : `${ajenas} reservas`
                }
              />
            )}

            {/* Una zona con varios cupos —la lavandería tiene cuatro
                lavadoras— sigue admitiendo reservas aunque ya haya alguna. */}
            {libres > 0 && (
              <Pressable
                onPress={onReservar}
                className="items-center rounded-lg border border-dashed border-gray-300 px-2 py-1.5"
              >
                <Text className="text-xs font-semibold text-green-600">
                  + Reservar
                  {cupos > 1 ? ` · quedan ${libres} de ${cupos}` : ""}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}
