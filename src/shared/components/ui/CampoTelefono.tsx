import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PAIS_POR_DEFECTO, paisPorCodigo } from "@/shared/constants";
import { Bandera } from "./Bandera";
import { Input } from "./Input";
import { SelectorDePais } from "./SelectorDePais";

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
 * El panel para elegir el país vive en `SelectorDePais`, que es el mismo que
 * usa `CampoPais`: dos copias de la misma lista se separan, y eso ya pasó en
 * este proyecto con el rango horario de un turno.
 *
 * ----------------------------------------------------------------------------
 * Quien lo monta le da un país. Siempre
 * ----------------------------------------------------------------------------
 * Si `codigoPais` viene vacío, el campo **pinta el país por defecto** —un botón
 * en blanco no se entiende— y entonces la pantalla enseña «🇨🇴 +57» mientras a
 * la base viaja cadena vacía. O sea que el número se guarda sin país, que es
 * justo lo que este campo existe para evitar.
 *
 * Salió invitando a un coadministrador desde el navegador el 05/10/2026: el
 * teléfono llegó a la invitación y `codigo_pais` quedó en null. Y no era de esa
 * pantalla: **las seis** que usan este campo arrancaban con `codigoPais: ""`.
 *
 * Se intentó arreglar aquí, avisando al padre del país que se estaba pintando.
 * **No funciona** en un formulario de react-hook-form: su `reset(initial)` corre
 * después del efecto del hijo y lo deshace. Un arreglo que se pierde según quién
 * te monte es peor que ninguno, porque parece que está.
 *
 * Así que el valor inicial es de quien monta el campo, y lo cuenta
 * `npm run paises`, con la marca en cero.
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
  const elegido = paisPorCodigo(codigoPais) ?? paisPorCodigo(PAIS_POR_DEFECTO);


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
          onPress={() => setAbierto(true)}
          accessibilityRole="button"
          accessibilityLabel={`País del teléfono: ${elegido?.nombre ?? "sin elegir"}`}
          className="flex-row items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-3 active:opacity-70"
        >
          <Bandera codigo={elegido?.codigo} ancho={20} />
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

      <SelectorDePais
        visible={abierto}
        codigo={elegido?.codigo ?? PAIS_POR_DEFECTO}
        titulo="¿De qué país es el número?"
        conPrefijo
        onElegir={onCodigoPaisChange}
        onClose={() => setAbierto(false)}
      />
    </View>
  );
}
