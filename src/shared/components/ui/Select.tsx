import { theme } from "@/config";
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal as RNModal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EtiquetaDelCampo } from "./EtiquetaDelCampo";
import { VeloModal } from "./VeloModal";
import { Ionicons } from "@expo/vector-icons";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string | number | null;
  options: (string | SelectOption)[];
  onChange: (val: string | number) => void;
  placeholder?: string;
  /** Lo que se lee al abrirlo si no hay nada que elegir. */
  textoSinOpciones?: string;
  /**
   * Lo que el formulario rechaza de este campo.
   *
   * No lo tenía --lo tienen `Input`, `CampoTelefono` y `CampoFecha`--, y por
   * eso un formulario con un desplegable obligatorio vacío se quedaba mudo:
   * el esquema rechazaba, el botón no hacía nada, y nadie veía por qué
   * (13/10/2026).
   */
  error?: string;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Elegir…",
  textoSinOpciones = "No hay opciones para elegir",
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const normalized: SelectOption[] = options.map((opt) =>
    typeof opt === "object" && opt !== null && "value" in opt
      ? opt
      : { value: opt, label: String(opt) },
  );

  const selected = normalized.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <View className="w-full">
      {label ? <EtiquetaDelCampo label={label} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${display}` : display}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(true)}
        /*
          `gap-2` para que la flecha no toque el texto. Sin el, en un selector
          estrecho --el tipo de vehiculo vivia en 110 px-- «Automóvil» llegaba
          hasta el chevron y los dos parecian pegados al borde. `justify-between`
          separa cuando sobra sitio y no hace nada cuando falta, que es justo
          el caso en el que hace falta.
        */
        className={`flex-row items-center justify-between gap-2 bg-white rounded-2xl px-4 py-3.5 border ${error ? "border-red-500" : "border-gray-200"}`}
      >
        <Text
          /*
            Una linea: si la etiqueta no cabe se recorta con puntos suspensivos
            en vez de partirse en dos y estirar la caja mas que la de al lado.
          */
          numberOfLines={1}
          className="flex-1 text-base"
          style={{
            color: selected ? theme.colors.text : theme.colors.textSecondary,
          }}
        >
          {display}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </Pressable>
      {error ? (
        <Text className="mt-1 text-xs text-red-600">{error}</Text>
      ) : null}

      <RNModal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        {/* El fondo lo pone `VeloModal`: antes era un velo opaco propio, escrito
            a mano, que ademas entraba deslizandose con `animationType="slide"`. */}
        <VeloModal
          visible={open}
          onPress={() => setOpen(false)}
          className="flex-1 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-2xl max-h-[60%] overflow-hidden"
            /*
              La app se dibuja detrás de la barra de botones del teléfono: sin
              este margen, la última opción quedaba debajo y no se podía
              pulsar (QA 23/10/2026, al elegir a quién llamar).
            */
            style={{ paddingBottom: insets.bottom }}
          >
            <FlatList
              data={normalized}
              keyExtractor={(item) => String(item.value)}
              /*
                Sin opciones la lista mide cero: la pantalla se oscurecia y no
                salia nada, que se lee como un desplegable roto. Lo vio el
                cliente el 12/10/2026 al asignar un estacionamiento un dia sin
                visitas.
              */
              ListEmptyComponent={
                <Text className="px-4 py-6 text-base text-center text-gray-500">
                  {textoSinOpciones}
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    /*
                      Cual esta elegida se veia **solo** en el fondo y la
                      negrita. `aria-selected` aparte de `accessibilityState`
                      porque react-native-web 0.21 no lo traduce.
                    */
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    aria-selected={isSelected}
                    onPress={() => handleSelect(item)}
                    className="px-4 py-3.5 border-b border-gray-100"
                    style={{
                      backgroundColor: isSelected
                        ? theme.colors.primaryLight
                        : "transparent",
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        fontWeight: isSelected ? "600" : "400",
                        color: isSelected
                          ? theme.colors.text
                          : theme.colors.textSecondary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </VeloModal>
      </RNModal>
    </View>
  );
}
