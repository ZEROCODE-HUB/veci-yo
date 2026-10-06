import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import {
  PAISES,
  PAIS_POR_DEFECTO,
  buscarPaises,
  paisPorCodigo,
} from "@/shared/constants";
import { Bandera } from "./Bandera";
import { BottomSheet } from "./BottomSheet";
import { SearchBar } from "./SearchBar";

/**
 * El panel para elegir un país, con buscador y bandera.
 *
 * Vive aparte porque lo usan dos campos --`CampoTelefono` y `CampoPais`-- y dos
 * copias de una lista se separan: es lo que ya pasó con el rango horario de un
 * turno, que un sitio escribía «08:00 - 16:00» y otro «08:00 a 16:00».
 *
 * `BottomSheet` y no `Select` porque son veintisiete países y `Select` no tiene
 * buscador. Se busca por nombre, por código y por prefijo.
 *
 * La bandera la dibuja `Bandera`, con el SVG empaquetado en el proyecto. Antes
 * salía del propio código del país --los «indicadores regionales» que el
 * sistema pinta como 🇨🇴-- y en Windows no se veía: ahí Chrome pintaba las dos
 * letras.
 */
export function SelectorDePais({
  visible,
  codigo,
  titulo,
  onElegir,
  onClose,
  /** Enseñar el prefijo telefónico de cada país. Solo en el campo de teléfono. */
  conPrefijo = false,
}: {
  visible: boolean;
  codigo: string;
  titulo: string;
  onElegir: (codigo: string) => void;
  onClose: () => void;
  conPrefijo?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const resultados = useMemo(() => buscarPaises(busqueda), [busqueda]);
  const elegido = paisPorCodigo(codigo) ?? paisPorCodigo(PAIS_POR_DEFECTO);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-3 px-4 pb-4">
        <Text className="text-base font-semibold text-gray-900">{titulo}</Text>

        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder={
            conPrefijo ? "Busca por país o por prefijo" : "Busca el país"
          }
        />

        <ScrollView style={{ maxHeight: 360 }} contentContainerClassName="gap-1">
          {resultados.map((pais) => {
            const esElegido = pais.codigo === elegido?.codigo;
            return (
              <Pressable
                key={pais.codigo}
                onPress={() => {
                  onElegir(pais.codigo);
                  onClose();
                }}
                accessibilityRole="radio"
                /*
                  Los dos: react-native-web no traduce `accessibilityState` a
                  ningún atributo del DOM. Está documentado en `Checkbox.tsx` y
                  ya mordió cinco veces en este proyecto.
                */
                aria-checked={esElegido}
                accessibilityState={{ checked: esElegido }}
                accessibilityLabel={
                  conPrefijo
                    ? `${pais.nombre}, prefijo ${pais.prefijo}`
                    : pais.nombre
                }
                className={`flex-row items-center gap-2 rounded-xl px-4 py-3 ${
                  esElegido ? "bg-primary" : "bg-gray-50"
                } active:opacity-70`}
              >
                <Bandera codigo={pais.codigo} ancho={24} />
                <Text
                  className={`flex-1 text-sm ${
                    esElegido ? "font-semibold text-gray-900" : "text-gray-700"
                  }`}
                >
                  {pais.nombre}
                </Text>
                {conPrefijo && (
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textMuted }}
                  >
                    +{pais.prefijo}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {resultados.length === 0 && (
            <Text
              className="py-6 text-center text-sm"
              style={{ color: theme.colors.textMuted }}
            >
              Ningún país con ese nombre. Si falta el tuyo, dilo y se añade.
            </Text>
          )}
        </ScrollView>

        <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
          {PAISES.length} países.
        </Text>
      </View>
    </BottomSheet>
  );
}
