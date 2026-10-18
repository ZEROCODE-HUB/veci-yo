import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SearchBar } from "@/shared/components";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { formatDateShortMonth } from "@/shared/utils";
import { IngresosSalidasTable } from "./IngresosSalidasTable";
import {
  useHoyDeMisViviendas,
  type DiaDeAnfitrion,
  type FiltroDeTipo,
} from "../hooks/useHoyDeMisViviendas";

/** Cómo se llama cada día en la pastilla: hoy, mañana, y luego su fecha. */
function nombreDelDia(dia: DiaDeAnfitrion): string {
  if (dia === 0) return "Hoy";
  if (dia === 1) return "Mañana";
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dia);
  return formatDateShortMonth(fecha);
}
const TIPOS: { valor: FiltroDeTipo; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "huespedes", texto: "Huéspedes" },
  { valor: "visitas", texto: "Visitas" },
];

/**
 * La tabla de ingresos y salidas de la portería, con lo de mis viviendas
 * (responsable de producto, 16/10/2026). Hoy y mañana, y con filtros.
 *
 * Cuántos días se ofrecen lo dice `porteria_dias_a_la_vista` (hoy 2: hoy y
 * mañana), el mismo parámetro que la lista de la portería.
 */
export function HoyDeMisViviendas() {
  const { dia, setDia, tipo, setTipo, busqueda, setBusqueda, filas } = useHoyDeMisViviendas();
  const parametros = useParametrosDeLaBase();

  // Sin el parámetro no se sabe cuántos días ofrecer: se espera.
  if (!parametros.listo) return null;
  const dias: DiaDeAnfitrion[] = Array.from(
    { length: parametros.numero("porteria_dias_a_la_vista") },
    (_, i) => i,
  );

  return (
    <View className="gap-3 py-3">
      <View className="flex-row gap-2" accessibilityRole="tablist">
        {dias.map((d) => (
          <Pastilla
            key={d}
            texto={nombreDelDia(d)}
            elegida={dia === d}
            onPress={() => setDia(d)}
            rol="tab"
          />
        ))}
      </View>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {TIPOS.map((t) => (
          <Pastilla
            key={t.valor}
            texto={t.texto}
            elegida={tipo === t.valor}
            onPress={() => setTipo(t.valor)}
            rol="radio"
          />
        ))}
      </View>
      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o vivienda" />
      <IngresosSalidasTable
        data={filas}
        vacio={
          dia <= 1
            ? `${nombreDelDia(dia)} no entra nadie a tus viviendas`
            : `El ${nombreDelDia(dia)} no entra nadie a tus viviendas`
        }
      />
    </View>
  );
}

function Pastilla({
  texto,
  elegida,
  onPress,
  rol,
}: {
  texto: string;
  elegida: boolean;
  onPress: () => void;
  rol: "tab" | "radio";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={rol}
      accessibilityState={rol === "tab" ? { selected: elegida } : { checked: elegida }}
      aria-selected={rol === "tab" ? elegida : undefined}
      aria-checked={rol === "radio" ? elegida : undefined}
      className="px-3.5 py-1.5 rounded-full"
      style={{ backgroundColor: elegida ? theme.colors.primary : theme.colors.borderLight }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: elegida ? theme.colors.text : theme.colors.textSecondary }}
      >
        {texto}
      </Text>
    </Pressable>
  );
}
