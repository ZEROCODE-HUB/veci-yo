import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import {
  PAISES,
  PAIS_POR_DEFECTO,
  buscarPaises,
  paisPorCodigo,
} from "@/shared/constants";
import { BottomSheet } from "./BottomSheet";
import { Input } from "./Input";
import { SearchBar } from "./SearchBar";

interface Props {
  label?: string;
  /** ISO 3166-1 alfa-2. Es lo que se guarda, no el prefijo. */
  codigoPais: string;
  onCodigoPaisChange: (codigo: string) => void;
  telefono: string;
  onTelefonoChange: (numero: string) => void;
  placeholder?: string;
  error?: string;
  /** Texto de ayuda bajo el campo. */
  ayuda?: string;
}

/**
 * Un teléfono con su país.
 *
 * Hasta el 03/10/2026 había **once columnas de teléfono** en nueve tablas y una
 * sola sabía de qué país era el número. Las otras diez eran texto suelto donde
 * cada quien escribía lo que quería: con prefijo, sin prefijo, con guiones.
 *
 * Importa más de lo que parece. El producto opera en Colombia y en Perú, y el
 * cliente quiere mandar avisos por WhatsApp, que necesita el número con su
 * prefijo internacional. Un «3001234567» sin país no se puede marcar desde
 * fuera ni mandar a ninguna parte.
 *
 * Lo que se guarda son **dos campos**: el código del país —`CO`— y el número.
 * El prefijo no se guarda: sale del catálogo. Si se guardara, cambiaría el día
 * que un país cambie el suyo y habría que corregir filas.
 *
 * Modelado sobre `CampoFecha`: un campo compuesto que abre su propio panel. Se
 * usa `BottomSheet` y no `Select` porque son casi treinta países y `Select` no
 * tiene buscador.
 */
export function CampoTelefono({
  label,
  codigoPais,
  onCodigoPaisChange,
  telefono,
  onTelefonoChange,
  placeholder = "Número de teléfono",
  error,
  ayuda,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const elegido = paisPorCodigo(codigoPais) ?? paisPorCodigo(PAIS_POR_DEFECTO);
  const resultados = useMemo(() => buscarPaises(busqueda), [busqueda]);

  return (
    <View className="w-full">
      {Boolean(label) && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      )}

      <View className="flex-row gap-2">
        {/*
          El prefijo es un botón, no un campo de texto: tecleándolo se puede
          escribir cualquier cosa, y de ahí venían los «+57», «57» y «Colombia»
          conviviendo en la misma columna.
        */}
        <Pressable
          onPress={() => {
            setBusqueda("");
            setAbierto(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`País del teléfono: ${elegido?.nombre ?? "sin elegir"}`}
          className="flex-row items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-3 active:opacity-70"
        >
          <Text className="text-sm font-medium text-gray-900">
            +{elegido?.prefijo ?? ""}
          </Text>
          <Text className="text-xs text-gray-400">▾</Text>
        </Pressable>

        <View className="flex-1">
          <Input
            value={telefono}
            /*
              Solo dígitos. El número se guarda limpio y el formato se decide al
              pintarlo: un dato no se guarda ya formateado, que es la regla que
              este proyecto aprendió con los rangos horarios.
            */
            onChangeText={(texto) => onTelefonoChange(texto.replace(/\D/g, ""))}
            placeholder={placeholder}
            type="numeric"
            error={error}
          />
        </View>
      </View>

      {Boolean(ayuda) && <Text className="text-xs text-gray-500 mt-1">{ayuda}</Text>}

      <BottomSheet visible={abierto} onClose={() => setAbierto(false)}>
        <View className="gap-3 px-4 pb-4">
          <Text className="text-base font-semibold text-gray-900">
            ¿De qué país es el número?
          </Text>

          <SearchBar
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Busca por país o por prefijo"
          />

          <ScrollView style={{ maxHeight: 360 }} contentContainerClassName="gap-1">
            {resultados.map((pais) => {
              const esElegido = pais.codigo === elegido?.codigo;
              return (
                <Pressable
                  key={pais.codigo}
                  onPress={() => {
                    onCodigoPaisChange(pais.codigo);
                    setAbierto(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: esElegido }}
                  accessibilityLabel={`${pais.nombre}, prefijo ${pais.prefijo}`}
                  className={`flex-row items-center justify-between rounded-xl px-4 py-3 ${
                    esElegido ? "bg-primary" : "bg-gray-50"
                  } active:opacity-70`}
                >
                  <Text
                    className={`text-sm ${
                      esElegido ? "font-semibold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {pais.nombre}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{
                      color: esElegido
                        ? theme.colors.text
                        : theme.colors.textSecondary,
                    }}
                  >
                    +{pais.prefijo}
                  </Text>
                </Pressable>
              );
            })}

            {resultados.length === 0 && (
              <Text className="py-6 text-center text-sm text-gray-500">
                Ningún país se llama así. Prueba con el prefijo.
              </Text>
            )}
          </ScrollView>

          <Text className="text-xs text-gray-400">
            {PAISES.length} países. Si falta el tuyo, dínoslo.
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}
