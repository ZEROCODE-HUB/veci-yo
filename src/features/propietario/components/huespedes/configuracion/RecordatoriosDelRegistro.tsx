import React from "react";
import { Pressable, Text, View } from "react-native";
import { Toggle } from "@/shared/components";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { Parametros, RentaCorta } from "./tipos";

/**
 * Recordatorios del preregistro.
 *
 * Antes del 03/10/2026 no existía **ninguna tarea periódica en todo el
 * proyecto**: quien dejaba su preregistro a medias no volvía a saber de Veciyo,
 * y el problema se descubría con él en el vestíbulo.
 *
 * Parametrizable por decisión del cliente ese mismo día: «el anfitrión que
 * elija y ya», con 7, 3 y 1 por defecto. Los días que se ofrecen salen de los
 * parámetros: no son lo que la base admite --de 1 a 60-- sino los que tiene
 * sentido ofrecer, que con catorce botones nadie elige.
 */
export function RecordatoriosDelRegistro({
  renta: r,
  parametros,
}: {
  renta: RentaCorta;
  parametros: Parametros;
}) {
  const { recordatorios, setRecordatorios } = r;
  return (
    <SeccionDeConfiguracion
      titulo="Recordatorios del registro"
      subtitulo="A quién avisar cuando un huésped no ha terminado su preregistro, y con cuánta antelación."
    >
      <Toggle
        value={recordatorios.alHuesped}
        onChange={(valor) => setRecordatorios((previo) => ({ ...previo, alHuesped: valor }))}
        labelRight="Avisar al huésped"
      />
      {/*
        Esto no es una nota al pie: cada aviso le emite un enlace nuevo y el
        anterior deja de valer --el viejo no se puede recuperar, en la base vive
        solo su huella--. Quien apaga esto suele ser quien prefiere hablarle él
        mismo.
      */}
      {recordatorios.alHuesped && (
        <Text className="mt-2 text-xs leading-5 text-gray-500">
          Cada aviso le manda un enlace nuevo, y el anterior deja de funcionar.
        </Text>
      )}

      <View className="mt-4">
        <Toggle
          value={recordatorios.alAnfitrion}
          onChange={(valor) => setRecordatorios((previo) => ({ ...previo, alAnfitrion: valor }))}
          labelRight="Avisarme a mí de quién falta"
        />
      </View>

      <Text className="mt-5 mb-2 text-xs font-semibold text-gray-700">
        Cuántos días antes de que llegue
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {parametros.lista<number>("preregistro_recordatorio_dias_opciones").map((dia) => {
          const puesto = recordatorios.dias.includes(dia);
          return (
            <Pressable
              key={dia}
              /*
                `checkbox` y `checked`, no `button` con `selected`:
                react-native-web **no traduce** `selected` a nada en el DOM
                --comprobado en el navegador, `aria-selected` venía vacío-- así
                que el estado solo existía en el color. Y es lo que son: una
                lista de casillas, no botones.
              */
              accessibilityRole="checkbox"
              /*
                Los dos, como ya hace `Checkbox` y por el mismo motivo escrito
                allí: react-native-web **no traduce** `accessibilityState` a
                `aria-checked`.
              */
              aria-checked={puesto}
              accessibilityState={{ checked: puesto }}
              accessibilityLabel={`Avisar ${dia} ${dia === 1 ? "día" : "días"} antes`}
              onPress={() =>
                setRecordatorios((previo) => ({
                  ...previo,
                  dias: puesto
                    ? previo.dias.filter((d) => d !== dia)
                    : [...previo.dias, dia].sort((a, b) => b - a),
                }))
              }
              className={`rounded-full border px-4 py-2 ${
                puesto ? "border-transparent bg-gray-900" : "border-gray-300 bg-white"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${puesto ? "text-white" : "text-gray-700"}`}
              >
                {dia} {dia === 1 ? "día" : "días"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {recordatorios.dias.length === 0 && (
        <Text className="mt-3 text-xs leading-5 text-amber-700">
          Sin ningún día marcado no se manda ningún recordatorio.
        </Text>
      )}
    </SeccionDeConfiguracion>
  );
}
