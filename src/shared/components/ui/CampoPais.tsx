import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PAIS_POR_DEFECTO, banderaDe, paisPorCodigo } from "@/shared/constants";
import { SelectorDePais } from "./SelectorDePais";

interface Props {
  label?: string;
  /** ISO 3166-1 alfa-2 --`CO`--, que es lo que se guarda en la base. */
  value: string;
  onChange: (codigo: string) => void;
  error?: string;
  ayuda?: string;
  /** Qué poner cuando todavía no hay ninguno elegido. */
  placeholder?: string;
}

/**
 * El país, elegido de una lista.
 *
 * Era un campo de texto libre hasta el 05/10/2026, y lo que se guardaba eran
 * **las dos primeras letras de lo que se escribiera**:
 * `valores.pais.slice(0, 2).toUpperCase()`. O sea que escribir «Estados
 * Unidos» guardaba `ES`, que es España, y «Panamá» guardaba `PA`, que por
 * casualidad sí es Panamá.
 *
 * No es cosmético. De `condominio.pais` dependen el tipo de documento que se
 * pide en la puerta, la etiqueta del identificador fiscal --RUC en Perú, NIT
 * en Colombia-- y el formato de los reportes al ministerio. Un código
 * inventado se arrastra a todo eso.
 *
 * La lista es **nuestra**, no de una API pública. Son veintisiete países que
 * cambian una vez por década: pedirlos por red añade una dependencia, deja el
 * campo inservible sin conexión y mete una espera donde no hacía falta. La
 * bandera sale del propio código, sin imagen y sin descarga.
 */
export function CampoPais({
  label,
  value,
  onChange,
  error,
  ayuda,
  placeholder = "Elige el país",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const elegido = paisPorCodigo(value);

  return (
    <View className="w-full">
      {Boolean(label) && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      )}

      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`País: ${elegido?.nombre ?? "sin elegir"}`}
        className={`flex-row items-center gap-2 rounded-xl border bg-white px-3 py-3 active:opacity-70 ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      >
        {elegido ? (
          <>
            <Text style={{ fontSize: 15 }}>{banderaDe(elegido.codigo)}</Text>
            <Text className="flex-1 text-sm text-gray-900">{elegido.nombre}</Text>
          </>
        ) : (
          <Text className="flex-1 text-sm text-gray-400">{placeholder}</Text>
        )}
        <Text className="text-xs text-gray-400">▾</Text>
      </Pressable>

      {Boolean(error) && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
      {Boolean(ayuda) && <Text className="text-xs text-gray-500 mt-1">{ayuda}</Text>}

      <SelectorDePais
        visible={abierto}
        codigo={elegido?.codigo ?? PAIS_POR_DEFECTO}
        titulo="¿En qué país está?"
        onElegir={onChange}
        onClose={() => setAbierto(false)}
      />
    </View>
  );
}
