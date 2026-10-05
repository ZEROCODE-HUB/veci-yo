import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Modal } from "./Modal";

interface ListaProps {
  /** La hora elegida, en `HH:mm`. */
  value: string;
  onChange: (hora: string) => void;
  /** Cada cuántos minutos se ofrece una hora. */
  paso?: number;
  /** No se puede elegir antes de esta. */
  minima?: string;
}

/**
 * La lista de horas, suelta.
 *
 * Se exporta porque hay dos sitios --el detalle de la portería y el de la
 * reserva-- donde la hora **no se edita desde un campo** sino desde un modal que
 * ya existe. Allí no cabe un `CampoHora` entero, que trae su propio botón; cabe
 * esto.
 */
export function ListaDeHoras({ value, onChange, paso = 15, minima }: ListaProps) {
  const horas = useMemo(() => horasDelDia(paso), [paso]);

  return (
    <ScrollView style={{ maxHeight: 320 }} contentContainerClassName="gap-1 pb-2">
      {horas.map((hora) => {
        const elegida = hora === value;
        /*
          Comparación en texto: `HH:mm` con ceros a la izquierda ordena igual
          alfabéticamente que cronológicamente, y construir una fecha solo para
          comparar dos horas del mismo día es pedir un problema de zona horaria
          donde no hacía falta ninguno.
        */
        const vedada = Boolean(minima) && hora < minima!;
        return (
          <Pressable
            key={hora}
            disabled={vedada}
            accessibilityRole="radio"
            accessibilityState={{ selected: elegida, disabled: vedada }}
            accessibilityLabel={hora}
            onPress={() => onChange(hora)}
            className={`rounded-xl px-4 py-3 ${
              elegida ? "bg-primary" : "bg-gray-50"
            } ${vedada ? "opacity-40" : "active:opacity-70"}`}
          >
            <Text
              className={`text-center text-sm ${
                elegida ? "font-semibold text-gray-900" : "text-gray-700"
              }`}
            >
              {hora}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Todas las horas del día cada `paso` minutos, en `HH:mm`. */
function horasDelDia(paso: number): string[] {
  const salida: string[] = [];
  for (let minuto = 0; minuto < 24 * 60; minuto += paso) {
    const h = String(Math.floor(minuto / 60)).padStart(2, "0");
    const m = String(minuto % 60).padStart(2, "0");
    salida.push(`${h}:${m}`);
  }
  return salida;
}

interface Props {
  label?: string;
  /** La hora en `HH:mm`, que es como la guarda la base (`time`). */
  value: string;
  onChange: (hora: string) => void;
  placeholder?: string;
  /** Texto de ayuda bajo el campo. */
  ayuda?: string;
  /**
   * Cada cuántos minutos se ofrece una hora. Quince por defecto: es el grano
   * con el que la gente dice a qué hora llega.
   */
  paso?: number;
  /** No se puede elegir antes de esta. Para un «hasta» que sigue a un «desde». */
  minima?: string;
  /** Se pinta en línea en vez de abrir un modal. Ver `CampoFecha`. */
  enLinea?: boolean;
}

/**
 * Campo de hora: se pulsa y se abre la lista.
 *
 * Hermano de [CampoFecha], y existe por el mismo motivo por el que aquel dejó de
 * ser suficiente: hasta el 02/10/2026 las horas se elegían con
 * `@react-native-community/datetimepicker`, **que en web no existe**. No es una
 * forma de hablar: el paquete no trae ningún `.web.js`, así que resuelve a una
 * función que hace `console.warn` y devuelve `null`.
 *
 * El resultado era el que vio el cliente: se pulsa el campo, el `Pressable`
 * responde, el estado cambia, el componente se monta... y no aparece nada. Siete
 * campos de hora en cinco pantallas, todos muertos. Y las pruebas de componentes
 * no podían verlo porque **doblaban ese paquete con `() => null`**, o sea que
 * reproducían el fallo en vez de detectarlo.
 *
 * Esto es React Native puro --`View`, `Pressable`, `Text`-- así que funciona
 * igual en el navegador y en el teléfono. Una sola forma de elegir una hora en
 * todo el producto.
 */
export function CampoHora({
  label,
  value,
  onChange,
  placeholder = "Elegir hora",
  ayuda,
  paso = 15,
  minima,
  enLinea = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  const lista = (
    <ListaDeHoras
      value={value}
      paso={paso}
      minima={minima}
      onChange={(hora) => {
        onChange(hora);
        setAbierto(false);
      }}
    />
  );

  return (
    <View className="w-full">
      {Boolean(label) && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      )}

      <Pressable
        onPress={() => setAbierto((previo) => !previo)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        className="rounded-xl border border-gray-200 bg-white px-4 py-3 active:opacity-70"
      >
        <Text className={`text-sm ${value ? "text-gray-900" : "text-gray-500"}`}>
          {value || placeholder}
        </Text>
      </Pressable>

      {Boolean(ayuda) && <Text className="text-xs text-gray-500 mt-1">{ayuda}</Text>}

      {/*
        En línea cuando el campo vive dentro de un modal. Un modal sobre otro
        modal se puede hacer, pero en esta aplicación los modales llevan
        animación propia y velo propio, y apilarlos ya dio dos sustos
        documentados en AGENTS.md. Desplegar la lista donde está el campo
        resuelve el caso sin tocar nada de eso.
      */}
      {enLinea
        ? abierto && (
            <View className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
              {lista}
            </View>
          )
        : (
            <Modal
              visible={abierto}
              onClose={() => setAbierto(false)}
              title={label ?? "Elegir hora"}
            >
              {lista}
            </Modal>
          )}
    </View>
  );
}
