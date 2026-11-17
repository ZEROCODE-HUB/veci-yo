import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Input } from "@/shared/components";
import {
  garitasQueFaltan,
  type GaritaQueFalta,
  type ModeloDeGaritas as Modelo,
} from "../../helpers/arquitectura.helpers";

const MODELOS: Array<{ valor: Modelo; titulo: string; detalle: string }> = [
  {
    valor: "por_torre",
    titulo: "Una garita principal y una en cada torre",
    detalle: "Ej: Garita principal, Garita Torre 1, Garita Torre 2",
  },
  {
    valor: "vehicular",
    titulo: "Una garita principal y una vehicular",
    detalle: "Ej: Garita principal y Garita vehicular",
  },
];

/**
 * «¿Cómo son las garitas del edificio?» (16/11/2026). El cliente: «Hay 1
 * garita principal y luego las torres tienen garitas, o solo hay una garita
 * principal y una vehicular. Y poner cómo se llaman».
 *
 * Crea solo las que faltan, con un nombre sugerido que se puede cambiar antes
 * de crear. Las que ya existen no se tocan.
 */
export function ModeloDeGaritas({
  torres,
  porterias,
  onCrear,
}: {
  torres: Array<{ uuid?: string; numero: number; nombre: string }>;
  porterias: Array<{ tipo: string; torreId?: string | null }>;
  /** `false` si falló: se queda lo escrito. */
  onCrear: (garitas: GaritaQueFalta[]) => Promise<boolean>;
}) {
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [creando, setCreando] = useState(false);
  const faltan = modelo ? garitasQueFaltan(modelo, torres, porterias) : [];
  const nombreDe = (g: GaritaQueFalta) => nombres[g.clave] ?? g.nombre;
  const sinNombre = faltan.some((g) => !nombreDe(g).trim());

  return (
    <View className="gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <Text className="text-sm font-bold text-gray-900">¿Cómo son las garitas del edificio?</Text>
      {MODELOS.map((m) => {
        const elegido = modelo === m.valor;
        return (
          <Pressable
            key={m.valor}
            accessibilityRole="radio"
            aria-checked={elegido}
            accessibilityState={{ checked: elegido }}
            onPress={() => setModelo(m.valor)}
            className={`flex-row items-center gap-3 rounded-xl border p-3 ${elegido ? "border-primary bg-blue-50" : "border-gray-200"}`}
          >
            <View
              className={`h-5 w-5 items-center justify-center rounded-full border-2 ${elegido ? "border-primary" : "border-gray-300"}`}
            >
              {elegido ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">{m.titulo}</Text>
              <Text className="text-xs text-gray-500">{m.detalle}</Text>
            </View>
          </Pressable>
        );
      })}
      {modelo === null ? null : faltan.length === 0 ? (
        <Text className="text-sm text-gray-600">Ya tienes todas las garitas de este modelo.</Text>
      ) : (
        <View className="gap-2">
          <Text className="text-xs text-gray-500">
            Faltan estas. Puedes cambiarles el nombre antes de crearlas:
          </Text>
          {faltan.map((g) => (
            <Input
              key={g.clave}
              label={g.tipo === "garita_torre" ? "Garita de torre" : g.tipo === "acceso_vehicular" ? "Garita vehicular" : "Garita principal"}
              value={nombreDe(g)}
              onChangeText={(v) => setNombres({ ...nombres, [g.clave]: v })}
            />
          ))}
          <Button
            fullWidth
            loading={creando}
            disabled={sinNombre}
            onPress={() => {
              setCreando(true);
              void onCrear(faltan.map((g) => ({ ...g, nombre: nombreDe(g).trim() }))).then((ok) => {
                setCreando(false);
                if (ok) {
                  setNombres({});
                  setModelo(null);
                }
              });
            }}
          >
            {faltan.length === 1 ? "Crear 1 garita" : `Crear ${faltan.length} garitas`}
          </Button>
        </View>
      )}
    </View>
  );
}
