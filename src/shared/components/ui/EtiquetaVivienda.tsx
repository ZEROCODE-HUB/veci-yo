import { theme } from "@/config";
import { Text, View } from "react-native";

/**
 * El depto de alguien, como etiqueta al lado de su nombre.
 *
 * Lo pidio el cliente el 02/10/2026: «el TAG del depto junto al nombre o el
 * alias, casi en todo lado». Donde no cabe una etiqueta aparte --una ficha, una
 * fila apretada-- va `nombreDeVecino`, que compone el texto.
 *
 * No pinta nada si no hay depto. La administracion y la porteria no viven en el
 * edificio, y una etiqueta vacia --o un «sin depto»-- saldria en cada mensaje
 * que escriben.
 */
export function EtiquetaVivienda({ codigo }: { codigo?: string | null }) {
  const donde = codigo?.trim();
  if (!donde) return null;

  return (
    <View
      // Se lee entero: un lector de pantalla diria «301» a secas, que no dice
      // de que es ese numero.
      accessibilityLabel={`Departamento ${donde}`}
      className="rounded-full px-1.5 py-0.5"
      style={{ backgroundColor: theme.colors.borderLight }}
    >
      <Text
        className="text-[10px] font-semibold"
        style={{ color: theme.colors.textSecondary }}
      >
        {donde}
      </Text>
    </View>
  );
}
