import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import {
  PAISES,
  paisPorDefecto,
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
 * `BottomSheet` y no `Select` porque son 245 países y `Select` no tiene
 * buscador. Se busca por nombre, por código y por prefijo. La lista es una
 * `FlatList`, que pinta solo lo que se ve: con todos los países del mundo, cada
 * uno con su bandera, pintarlos de golpe trababa la hoja al abrirla.
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
  /** Si se da, solo se ofrecen estos países. */
  codigos,
}: {
  visible: boolean;
  codigo: string;
  titulo: string;
  onElegir: (codigo: string) => void;
  onClose: () => void;
  conPrefijo?: boolean;
  codigos?: string[];
}) {
  const [busqueda, setBusqueda] = useState("");
  /*
    Cerrar deja el buscador en blanco: al volver a abrirlo seguía con lo que
    se buscó la vez anterior y solo esas opciones (QA 23/10/2026).
  */
  const cerrar = () => {
    setBusqueda("");
    onClose();
  };
  const resultados = useMemo(
    () => buscarPaises(busqueda).filter((p) => !codigos || codigos.includes(p.codigo)),
    [busqueda, codigos],
  );
  const elegido = paisPorCodigo(codigo) ?? paisPorCodigo(paisPorDefecto());

  return (
    <BottomSheet visible={visible} onClose={cerrar}>
      <View className="gap-3 px-4 pb-4" style={{ flexShrink: 1 }}>
        <Text className="text-base font-semibold text-gray-900">{titulo}</Text>

        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder={
            conPrefijo ? "Busca por país o por prefijo" : "Busca el país"
          }
        />

        <FlatList
          data={resultados}
          keyExtractor={(pais) => pais.codigo}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          style={{ maxHeight: 360, flexShrink: 1 }}
          contentContainerClassName="gap-1"
          renderItem={({ item: pais }) => {
            const esElegido = pais.codigo === elegido?.codigo;
            return (
              <Pressable
                onPress={() => {
                  onElegir(pais.codigo);
                  cerrar();
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
          }}
          ListEmptyComponent={
            <Text
              className="py-6 text-center text-sm"
              style={{ color: theme.colors.textMuted }}
            >
              Ningún país con ese nombre.
            </Text>
          }
        />

        <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
          {codigos ? codigos.length : PAISES.length} países.
        </Text>
      </View>
    </BottomSheet>
  );
}
