import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Bloque, type EstadoDeLaCarga } from "@/shared/components";
import { useNavegacion } from "@/shared/hooks";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { cuentaDePasos, type PasoParaEmpezar } from "../helpers/pasosParaEmpezar";

interface Props {
  titulo: string;
  pasos: PasoParaEmpezar[];
  carga: EstadoDeLaCarga;
  /** «No aplica»: quita ese paso de la tarjeta (18/11/2026). */
  onQuitarPaso?: (id: string) => void;
  /** «Ocultar»: quita la tarjeta entera (18/11/2026). */
  onOcultar?: () => void;
}

/**
 * La tarjeta «Tu edificio, paso a paso» del inicio (pedido del cliente,
 * 16/11/2026): «algo sencillo… que se vea bien y que le lleve a la pantalla».
 *
 * Título, «4 de 7 listos», una barra y una fila por paso. Cuando están todos,
 * desaparece: ya no hay nada que hacer y ocuparía sitio para siempre.
 *
 * Si algo no se pudo cargar tampoco sale: es una ayuda, y una lista con pasos
 * «pendientes» que quizá ya están hechos confunde más que no verla.
 */
export function ListaParaEmpezar({ titulo, pasos, carga, onQuitarPaso, onOcultar }: Props) {
  const navigation = useNavegacion();
  const { hechos, total, completa } = cuentaDePasos(pasos);

  if (carga.fallo) return null;
  if (!carga.cargando && (total === 0 || completa)) return null;

  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;

  return (
    <View className="bg-white rounded-xl p-5 gap-1" style={{ boxShadow: theme.shadows.card }}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="shrink text-xl font-bold text-gray-900">{titulo}</Text>
        {onOcultar && !carga.cargando ? (
          <Pressable onPress={onOcultar} accessibilityRole="button" accessibilityLabel="Ocultar esta tarjeta">
            <Text className="text-xs font-semibold" style={{ color: theme.colors.textSecondary }}>
              Ocultar
            </Text>
          </Pressable>
        ) : null}
      </View>
      {carga.cargando ? (
        <View className="gap-3 mt-2" aria-busy accessibilityLabel="Cargando tus pasos">
          <Bloque ancho="30%" alto={12} />
          <Bloque alto={6} />
          <Bloque ancho="80%" alto={14} />
          <Bloque ancho="70%" alto={14} />
          <Bloque ancho="75%" alto={14} />
        </View>
      ) : (
        <>
          <Text className="text-sm text-gray-500">
            {hechos} de {total} listos
          </Text>
          <View
            className="h-1.5 rounded-full overflow-hidden mt-2 mb-1"
            style={{ backgroundColor: theme.colors.borderLight }}
            accessibilityRole="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={hechos}
          >
            <View
              className="h-full rounded-full"
              style={{ width: `${porcentaje}%`, backgroundColor: theme.colors.success }}
            />
          </View>
          {pasos.map((paso) => (
            <FilaDelPaso
              key={paso.id}
              paso={paso}
              onQuitar={onQuitarPaso && !paso.hecho ? () => onQuitarPaso(paso.id) : undefined}
              onPress={
                paso.destino
                  ? () => navigateToRoute(navigation, paso.destino!.ruta, paso.destino!.params)
                  : paso.accion
              }
            />
          ))}
        </>
      )}
    </View>
  );
}

function FilaDelPaso({
  paso,
  onPress,
  onQuitar,
}: {
  paso: PasoParaEmpezar;
  onPress?: () => void;
  onQuitar?: () => void;
}) {
  const contenido = (
    <>
      <Ionicons
        name={paso.hecho ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={paso.hecho ? theme.colors.success : theme.colors.borderStrong}
      />
      <View className="flex-1">
        <Text className={paso.hecho ? "text-sm text-gray-500" : "text-sm font-medium text-gray-900"}>
          {paso.texto}
        </Text>
        {paso.nota ? <Text className="text-xs text-gray-500">{paso.nota}</Text> : null}
      </View>
      {onQuitar ? (
        <Pressable onPress={onQuitar} accessibilityRole="button" accessibilityLabel={`Quitar «${paso.texto}»: no aplica`}>
          <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
            No aplica
          </Text>
        </Pressable>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} /> : null}
    </>
  );
  const estado = paso.hecho ? "listo" : "pendiente";
  const borde = { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight };

  // Lo que el guardia no puede hacer él mismo (su garita, su turno) no se pulsa.
  if (!onPress) {
    return (
      <View
        className="flex-row items-center gap-3 py-3"
        style={borde}
        accessibilityLabel={`${paso.texto}, ${estado}`}
      >
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${paso.texto}, ${estado}`}
      className="flex-row items-center gap-3 py-3"
      style={borde}
    >
      {contenido}
    </Pressable>
  );
}
