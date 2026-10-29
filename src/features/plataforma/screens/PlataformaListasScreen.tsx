import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, Card, Cargando } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { ListaDelPanel, OpcionDelPanel } from "../services/plataforma.repo";
import { useListasDeLaApp } from "../hooks/usePanelDeLaApp";
import { EditarOpcion } from "../components/EditarOpcion";
import { AgregarOpcion } from "../components/AgregarOpcion";

/**
 * Las listas de opciones de la app (28/10/2026): motivos de viaje, cargos,
 * plataformas de una reserva, siglas de la TRA, fuentes de antecedentes…
 * Estaban escritas en el código de cada pantalla.
 *
 * Solo salen las que la app lee de verdad (`catalogo_info.conectada`): una
 * que se pudiera cambiar aquí sin que cambie nada sería decorativa. Una opción
 * no se borra --puede haber datos que la usan--: se apaga. Y solo se agregan
 * opciones a las listas que lo admiten; en las demás el código decide algo con
 * cada una, o el valor se guarda en un tipo cerrado de la base.
 */
export function PlataformaListasScreen() {
  const { listas, cargando, error, esDueno } = useListasDeLaApp();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ lista: ListaDelPanel; opcion: OpcionDelPanel } | null>(null);
  const [agregandoA, setAgregandoA] = useState<ListaDelPanel | null>(null);

  if (cargando) return <Cargando texto="las listas" />;

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar las listas")}</Text>
        </Card>
      ) : null}

      {listas.map((lista) => {
        const desplegada = abierta === lista.catalogo;
        const encendidas = lista.opciones.filter((o) => o.activo).length;
        return (
          <Card key={lista.catalogo} className="p-0">
            <Pressable
              onPress={() => setAbierta(desplegada ? null : lista.catalogo)}
              accessibilityRole="button"
              accessibilityLabel={lista.titulo}
              aria-expanded={desplegada}
              accessibilityState={{ expanded: desplegada }}
              className="flex-row items-center gap-3 p-4"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">{lista.titulo}</Text>
                <Text className="text-xs text-gray-500">
                  {`${encendidas} de ${lista.opciones.length} se ofrecen${lista.riesgo === "alto" ? " · Riesgo alto" : ""}`}
                </Text>
              </View>
              <Ionicons
                name={desplegada ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>

            {desplegada ? (
              <View className="border-t border-gray-100">
                <Text className="px-4 pt-3 text-xs leading-5 text-gray-600">{lista.descripcion}</Text>
                {lista.opciones.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => setEditando({ lista, opcion: o })}
                    accessibilityRole="button"
                    accessibilityLabel={o.etiqueta}
                    className="flex-row items-center gap-3 px-4 py-3 active:opacity-70"
                  >
                    <View className="flex-1">
                      <Text className={`text-sm ${o.activo ? "text-gray-900" : "text-gray-400"}`}>
                        {`${o.etiqueta}${o.pais ? ` (${o.pais})` : ""}`}
                      </Text>
                      <Text className="text-2xs text-gray-400">{o.codigo}</Text>
                    </View>
                    <Text className={`text-xs ${o.activo ? "text-success" : "text-gray-400"}`}>
                      {o.activo ? "Se ofrece" : "Apagada"}
                    </Text>
                  </Pressable>
                ))}
                {esDueno && lista.admiteNuevas ? (
                  <View className="p-4 pt-1">
                    <Button variant="secondary" size="sm" onPress={() => setAgregandoA(lista)}>
                      Agregar una opción
                    </Button>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}

      {editando ? (
        <EditarOpcion
          key={editando.opcion.id}
          lista={editando.lista}
          opcion={editando.opcion}
          esDueno={esDueno}
          onClose={() => setEditando(null)}
        />
      ) : null}
      {agregandoA ? (
        <AgregarOpcion key={agregandoA.catalogo} lista={agregandoA} onClose={() => setAgregandoA(null)} />
      ) : null}
    </DesplazableConTeclado>
  );
}
