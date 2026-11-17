import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input } from "@/shared/components";
import { limpiarNomenclatura } from "../../helpers/arquitectura.helpers";

type Fila = { nombre: string; nomenclatura: string; nuevo: boolean };
type Cantidades = Record<string, { privados: string; visita: string }>;

/**
 * Las filas «Nivel · privados · de visita» del alta de una torre (16/11/2026).
 *
 * Sustituyen a «Cocheras privadas» y «Cocheras de visitas», que creaban
 * `T1-P01` y `V1-01` sin decir dónde estaban. Ahora cada estacionamiento
 * nace en su nivel y con su nomenclatura: `S1-01`, `S1-V01`. Los niveles que
 * no existen todavía (los sugeridos o los escritos aquí) se crean al guardar,
 * y solo si se les pone alguna cantidad.
 */
export function EstacionamientosPorNivel({
  filas,
  cantidades,
  onCantidades,
  onNivelNuevo,
  resumen,
}: {
  filas: Fila[];
  cantidades: Cantidades;
  onCantidades: (cantidades: Cantidades) => void;
  onNivelNuevo: (nivel: { nombre: string; nomenclatura: string }) => void;
  resumen: string;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [nomenclatura, setNomenclatura] = useState("");
  const yaExiste = filas.some((f) => f.nomenclatura === nomenclatura);

  const cambiar = (clave: string, campo: "privados" | "visita", valor: string) =>
    onCantidades({
      ...cantidades,
      [clave]: { ...(cantidades[clave] ?? { privados: "", visita: "" }), [campo]: valor },
    });

  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <Text className="text-sm font-bold text-gray-900">Estacionamientos por nivel (opcional)</Text>
      <Text className="text-xs text-gray-500">
        Cuántos privados y de visita hay en cada nivel. El código lleva la nomenclatura del nivel.
      </Text>
      {filas.map((fila) => (
        <View key={fila.nomenclatura} className="flex-row items-end gap-2">
          <View className="flex-1 pb-3">
            <Text className="text-sm text-gray-900" numberOfLines={2}>
              {`${fila.nombre} (${fila.nomenclatura})`}
            </Text>
            {fila.nuevo ? <Text className="text-2xs text-gray-500">Se crea al guardar</Text> : null}
          </View>
          <View className="w-24">
            <Input
              label="Privados"
              value={cantidades[fila.nomenclatura]?.privados ?? ""}
              onChangeText={(v) => cambiar(fila.nomenclatura, "privados", v)}
              placeholder="0"
              soloCifras
            />
          </View>
          <View className="w-24">
            <Input
              label="De visita"
              value={cantidades[fila.nomenclatura]?.visita ?? ""}
              onChangeText={(v) => cambiar(fila.nomenclatura, "visita", v)}
              placeholder="0"
              soloCifras
            />
          </View>
        </View>
      ))}
      {agregando ? (
        <View className="gap-2">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Input label="Nombre del nivel" value={nombre} onChangeText={setNombre} placeholder="Ej: Semisótano" />
            </View>
            <View className="w-28">
              <Input
                label="Nomenclatura"
                value={nomenclatura}
                onChangeText={(v) => setNomenclatura(limpiarNomenclatura(v))}
                placeholder="Ej: SS"
                error={yaExiste ? "Ya existe" : undefined}
              />
            </View>
          </View>
          <View className="flex-row gap-2">
            <Button
              size="sm"
              disabled={!nombre.trim() || !nomenclatura || yaExiste}
              onPress={() => {
                onNivelNuevo({ nombre: nombre.trim(), nomenclatura });
                setNombre("");
                setNomenclatura("");
                setAgregando(false);
              }}
            >
              Agregar nivel
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setAgregando(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      ) : (
        <Button size="sm" variant="secondary" onPress={() => setAgregando(true)}>
          + Otro nivel
        </Button>
      )}
      {resumen ? (
        <View className="rounded-xl bg-blue-50 p-3">
          <Text className="text-sm text-blue-700 text-center">{resumen}</Text>
        </View>
      ) : null}
    </View>
  );
}
