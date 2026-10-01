import { Text, View } from "react-native";
import { Select, Toggle } from "@/shared/components";
import type { EstanciaConfig } from "@/shared/types";

/**
 * Los permisos de un tipo de estancia.
 *
 * Estaba escrito en una sola línea de dos mil caracteres —contra la regla 12—
 * y comparaba `values[field] === "Sí" || values[field] === "Si"` porque los
 * permisos eran texto y convivían tres grafías del mismo valor. Ahora son
 * booleanos y no hay nada que interpretar.
 */

type CampoBooleano =
  | "permiteVisitas"
  | "permiteHuespedNinos"
  | "permiteMascotas"
  | "permiteCocherasVisit";

const PERMISOS: Array<[CampoBooleano, string]> = [
  ["permiteVisitas", "Permite visitas"],
  ["permiteHuespedNinos", "Permite huésped niños"],
  ["permiteMascotas", "Permite mascotas"],
  ["permiteCocherasVisit", "Permite cocheras de visita"],
];

const HORARIOS_CHECKIN = ["08:30 a 13:30", "14:00 a 20:00", "24 horas"];

interface Props {
  values: EstanciaConfig;
  onChange: <C extends keyof EstanciaConfig>(
    campo: C,
    valor: EstanciaConfig[C],
  ) => void;
}

export function StayFields({
  values,
  onChange,
}: Props) {
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-y-3">
        {PERMISOS.map(([campo, etiqueta]) => (
          <View key={campo} className="w-[48%]">
            <Text className="text-sm text-gray-500 mb-1.5 font-medium">
              {etiqueta}
            </Text>
            {/* El rotulo esta arriba, en su propio `<Text>`: sin esto los
                cuatro interruptores se anuncian iguales y sin nombre. */}
            <Toggle
              value={values[campo]}
              onChange={(valor) => onChange(campo, valor)}
              accessibilityLabel={etiqueta}
            />
          </View>
        ))}
      </View>

      {/*
        Aqui estaban «Estancia mínima (días)» y «Estancia máxima (días)», que
        escribian `corta/larga_estancia_minima` y `_maxima` de
        `permiso_vivienda`. **Nadie las leia**: ni la base las imponia ni la
        aplicacion las mostraba --`reglas_de_estancia` las devuelve y su unico
        consumidor, `ficha_alojamiento`, solo usa las mascotas y los niños--.

        Decision del cliente del 29/09/2026: el limite de noches es **del
        edificio**, y para eso ya esta `limite_renta_corta_condominio`, que el
        anfitrion ve como advertencia al configurar su vivienda. Punto 62.

        La frontera entre estancia corta y larga no se toca: la marca
        `corta_hasta_noches`, que tiene su propio campo arriba.
      */}

      <Select
        label="Horario de check-in"
        value={values.horarioCheckin}
        options={HORARIOS_CHECKIN}
        placeholder="Seleccionar"
        onChange={(valor) => onChange("horarioCheckin", String(valor))}
      />
    </View>
  );
}
