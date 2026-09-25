import { Text, View } from "react-native";
import { Input, Select, Toggle } from "@/shared/components";
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
  incluirMaxima?: boolean;
  valorMaxima?: number | null;
  mostrarPistaMinima?: boolean;
}

export function StayFields({
  values,
  onChange,
  incluirMaxima,
  valorMaxima,
  mostrarPistaMinima = false,
}: Props) {
  /** El campo es numérico; la caja de texto habla en cadenas. */
  const aNumero = (texto: string) => {
    const n = Number(texto.replace(/\D/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

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

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Estancia mínima (días)"
            value={String(values.estanciaMinima ?? "")}
            onChangeText={(valor) => onChange("estanciaMinima", aNumero(valor))}
            placeholder="Ej: 2"
            type="numeric"
          />
          {mostrarPistaMinima && (
            <Text className="text-[10px] text-gray-400 mt-1">
              Se toma de la estancia máxima de la estancia corta
            </Text>
          )}
        </View>

        {incluirMaxima && (
          <View className="flex-1">
            <Input
              label="Estancia máxima (días)"
              value={String(valorMaxima ?? "")}
              onChangeText={(valor) => onChange("estanciaMaxima", aNumero(valor))}
              placeholder="Ej: 3"
              type="numeric"
            />
          </View>
        )}
      </View>

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
