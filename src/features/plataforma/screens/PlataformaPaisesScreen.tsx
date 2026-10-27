import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Bandera, Card, Cargando } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import { usePaisesDeLaApp } from "../hooks/usePanelDeLaApp";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import { paisesDelPanel } from "../helpers/paisesDelPanel";

/**
 * Los países (25/10/2026): su moneda, su zona horaria, su mayoría de edad y,
 * sobre todo, **qué documentos se piden en cada uno**. Hasta hoy se cambiaban
 * en Supabase, y los documentos ni eso: estaban escritos en la app y en la web,
 * iguales para todos.
 *
 * Solo los países donde opera Veciyo, hoy Colombia y Perú (26/10/2026: los
 * demás del catálogo salían aquí y el cliente pidió quitarlos).
 */
export function PlataformaPaisesScreen() {
  const navegacion = useNavegacionPlataforma();
  const { paises, cargando, error } = usePaisesDeLaApp();
  const lista = paisesDelPanel(paises);

  if (cargando) return <Cargando texto="los países" />;

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar los países")}</Text>
        </Card>
      ) : null}

      <Card className="p-0">
        {lista.map((p, i) => {
          const documentos = p.documentos.filter((d) => d.activo).length;
          const estado = !p.activo
            ? "Inactivo"
            : p.altaDeEdificio
              ? "Con alta de edificios"
              : "Sin alta de edificios";
          return (
            <Pressable
              key={p.codigo}
              onPress={() => navegacion.navigate("PlataformaPais", { codigo: p.codigo })}
              accessibilityRole="button"
              accessibilityLabel={p.nombre}
              className={`flex-row items-center gap-3 p-4 active:opacity-70 ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <Bandera codigo={p.codigo} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">{p.nombre}</Text>
                <Text className="text-xs text-gray-500">
                  {`${estado} · ${documentos} documento${documentos === 1 ? "" : "s"}${
                    p.edificios > 0 ? ` · ${p.edificios} edificio${p.edificios === 1 ? "" : "s"}` : ""
                  }`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </Pressable>
          );
        })}
      </Card>
    </DesplazableConTeclado>
  );
}
