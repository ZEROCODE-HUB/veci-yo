import { theme } from "@/config";
import React, { useRef, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { EtiquetaDelCampo } from "./EtiquetaDelCampo";
import { DesplegablePegado, medirAncla, type Ancla } from "./DesplegablePegado";
import { Ionicons } from "@expo/vector-icons";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  /** Una «i» junto a la etiqueta con lo que significa el campo (23/11/2026). */
  explicacion?: string;
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

/** El alto de cada opción, para llevar la lista hasta la elegida al abrir. */
const ALTO_DE_OPCION = 49;

export function Select({
  label,
  explicacion,
  value,
  options,
  onChange,
  placeholder = "Elegir…",
  textoSinOpciones = "No hay opciones para elegir",
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const campo = useRef<View>(null);
  const [ancla, setAncla] = useState<Ancla | null>(null);

  /*
    Desde el 25/11/2026 la lista sale **pegada al campo**, en todos los
    desplegables (pedido del cliente): antes subía una hoja desde abajo. Si el
    campo no se puede medir --no debería pasar--, se abre igual debajo de la
    pantalla visible en vez de no abrirse.
  */
  const abrir = () => {
    medirAncla(campo, (medida) => {
      setAncla(medida ?? { x: 16, y: 120, ancho: 320, alto: 0 });
      setOpen(true);
    });
  };

  const normalized: SelectOption[] = options.map((opt) =>
    typeof opt === "object" && opt !== null && "value" in opt
      ? opt
      : { value: opt, label: String(opt) },
  );

  const selected = normalized.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;

  const elegida = normalized.findIndex((o) => o.value === value);
  const indiceInicial = elegida > 5 ? elegida - 2 : undefined;

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <View className="w-full">
      {label ? <EtiquetaDelCampo label={label} explicacion={explicacion} /> : null}
      <Pressable
        ref={campo}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${display}` : display}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={abrir}
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

      <DesplegablePegado visible={open} ancla={ancla} onClose={() => setOpen(false)}>
        <FlatList
          data={normalized}
          keyExtractor={(item) => String(item.value)}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          // Abre en la elegida: con 73 horas no hay que bajar a buscarla.
          // Solo en listas largas: en una corta se ven todas y saltar no hace falta.
          initialScrollIndex={indiceInicial}
          getItemLayout={(_, index) => ({ length: ALTO_DE_OPCION, offset: ALTO_DE_OPCION * index, index })}
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
                className="justify-center px-4 border-b border-gray-100"
                style={{
                  height: ALTO_DE_OPCION,
                  backgroundColor: isSelected ? theme.colors.primaryLight : "transparent",
                }}
              >
                <Text
                  numberOfLines={2}
                  className="text-base"
                  style={{
                    fontWeight: isSelected ? "600" : "400",
                    color: isSelected ? theme.colors.text : theme.colors.textSecondary,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </DesplegablePegado>
    </View>
  );
}
