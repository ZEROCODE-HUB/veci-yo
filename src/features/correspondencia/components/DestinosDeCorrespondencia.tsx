import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Select, Toggle } from "@/shared/components";
import type { UnidadDisponible } from "@/shared/hooks/useUnidadesDisponibles";
import {
  etiquetaDeUnidad,
  pisosDe,
  soloVisibles,
  unidadesVisibles,
} from "../helpers/destinos";

interface DestinosDeCorrespondenciaProps {
  /** Todas las viviendas del edificio. */
  unidades: UnidadDisponible[];
  torres: string[];
  torre: string;
  piso: string;
  /** Los `unidadId` marcados. */
  seleccion: string[];
  onTorre: (torre: string) => void;
  onPiso: (piso: string) => void;
  onSeleccion: (seleccion: string[]) => void;
  error?: string;
}

/** La opción que quita el filtro. Sin ella, elegir una torre no tenía vuelta. */
const TODAS = { value: "", label: "Todas" };
const TODOS = { value: "", label: "Todos" };

/**
 * A qué departamentos va el envío.
 *
 * Torre y piso **acotan** la lista; no son un dato del envío --la vivienda ya
 * dice en qué torre y en qué piso está--. Lo que se guarda es lo marcado.
 *
 * Al cambiar de torre o de piso, lo marcado que deja de verse se desmarca: un
 * departamento elegido que la pantalla ya no enseña recibiría el envío sin que
 * quien lo registra lo sepa.
 */
export function DestinosDeCorrespondencia({
  unidades,
  torres,
  torre,
  piso,
  seleccion,
  onTorre,
  onPiso,
  onSeleccion,
  error,
}: DestinosDeCorrespondenciaProps) {
  const visibles = unidadesVisibles(unidades, torre, piso);
  const pisos = pisosDe(unidades, torre);
  // Sin torre elegida, dos torres pueden tener un «101» cada una.
  const conTorre = !torre && torres.length > 1;
  const todasMarcadas =
    visibles.length > 0 &&
    visibles.every((u) => seleccion.includes(u.unidadId));

  const cambiarTorre = (nueva: string) => {
    onTorre(nueva);
    // El piso elegido puede no existir en la torre nueva.
    const pisoSigue = pisosDe(unidades, nueva).includes(piso) ? piso : "";
    if (pisoSigue !== piso) onPiso(pisoSigue);
    onSeleccion(
      soloVisibles(seleccion, unidadesVisibles(unidades, nueva, pisoSigue)),
    );
  };

  const cambiarPiso = (nuevo: string) => {
    onPiso(nuevo);
    onSeleccion(soloVisibles(seleccion, unidadesVisibles(unidades, torre, nuevo)));
  };

  const alternar = (unidadId: string) =>
    onSeleccion(
      seleccion.includes(unidadId)
        ? seleccion.filter((id) => id !== unidadId)
        : [...seleccion, unidadId],
    );

  const alternarTodas = () =>
    onSeleccion(todasMarcadas ? [] : visibles.map((u) => u.unidadId));

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Select
            label="Torre:"
            value={torre || null}
            placeholder="Todas"
            options={[TODAS, ...torres]}
            onChange={(v) => cambiarTorre(String(v))}
          />
        </View>
        <View className="flex-1">
          <Select
            label="Piso:"
            value={piso || null}
            placeholder="Todos"
            options={[TODOS, ...pisos]}
            onChange={(v) => cambiarPiso(String(v))}
          />
        </View>
      </View>

      <Text className="text-sm text-gray-900 text-center leading-5">
        Elige el departamento al que va destinada la correspondencia
        recibida
        {/* Obligatorio: sin destino no hay a quién avisar (Para Claude 121). */}
        <Text style={{ color: theme.colors.danger }}> *</Text>
      </Text>

      {visibles.length > 1 ? (
        <Toggle
          value={todasMarcadas}
          onChange={alternarTodas}
          labelRight={`Seleccionar todos (${visibles.length})`}
        />
      ) : null}

      <View
        className="rounded-xl p-3 flex-row flex-wrap gap-2"
        style={{
          backgroundColor: theme.colors.bgCard,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        {visibles.length === 0 ? (
          <Text className="text-sm text-gray-500">
            No hay departamentos en esa torre y ese piso.
          </Text>
        ) : null}
        {visibles.map((u) => {
          const sel = seleccion.includes(u.unidadId);
          return (
            <Pressable
              key={u.unidadId}
              onPress={() => alternar(u.unidadId)}
              /*
                Se pueden elegir varias --es correspondencia para un montón de
                departamentos a la vez-- así que es una casilla, no un radio.
              */
              accessibilityRole="checkbox"
              accessibilityLabel={`Departamento ${u.codigo}, ${u.torre}`}
              accessibilityState={{ checked: sel }}
              aria-checked={sel}
              className="h-9 rounded-full items-center justify-center px-3"
              style={{
                borderWidth: 1.5,
                borderColor: sel ? theme.colors.primary : theme.colors.border,
                backgroundColor: sel
                  ? theme.colors.primaryLight
                  : "transparent",
              }}
            >
              <Text
                className="text-xs"
                style={{
                  fontWeight: sel ? "600" : "400",
                  color: theme.colors.text,
                }}
              >
                {etiquetaDeUnidad(u, conTorre)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text className="text-xs text-danger font-medium">{error}</Text>
      ) : null}
    </View>
  );
}
