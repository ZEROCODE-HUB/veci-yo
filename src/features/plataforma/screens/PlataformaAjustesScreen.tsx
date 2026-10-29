import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Card, Cargando, SearchBar } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { Parametro } from "../services/plataforma.repo";
import { useAjustesDeLaApp } from "../hooks/usePanelDeLaApp";
import { EditarAjuste } from "../components/EditarAjuste";

/**
 * Los ajustes de la app (23/10/2026): los ~120 parámetros de
 * `configuracion_plataforma`, que hasta hoy solo se cambiaban en Supabase.
 *
 * Cada uno trae de la base su descripción, unidad, rango y riesgo, así que la
 * pantalla no sabe nada de ninguno en concreto: uno nuevo aparece solo. Los
 * secretos no están aquí ni deben estar (van en las variables del servidor).
 */

const CATEGORIAS: Record<string, string> = {
  cuentas: "Cuentas e invitaciones",
  preregistro: "Preregistro de huéspedes",
  antecedentes: "Consulta de antecedentes",
  cuotas: "Cuotas y morosidad",
  zonas: "Zonas comunes",
  renta_corta: "Renta corta",
  porteria: "Portería",
  archivos: "Archivos",
  tareas: "Tareas automáticas",
  avisos: "Avisos y correos",
  edificio: "Edificios nuevos",
  integraciones: "Interruptores y conexiones",
  calendario: "Calendario externo",
  soporte: "Soporte y contacto",
  legal: "Legal y reportes al gobierno",
};

function valorLegible(p: Parametro): string {
  if (p.tipo === "booleano") return p.valor === "true" ? "Encendido" : "Apagado";
  return `${p.valor}${p.unidad ? ` ${p.unidad}` : ""}`;
}

export function PlataformaAjustesScreen() {
  const { parametros, cargando, error } = useAjustesDeLaApp();
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<Parametro | null>(null);

  const porCategoria = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const grupos = new Map<string, Parametro[]>();
    for (const p of parametros) {
      if (q && !`${p.descripcion} ${p.clave}`.toLowerCase().includes(q)) continue;
      grupos.set(p.categoria, [...(grupos.get(p.categoria) ?? []), p]);
    }
    return [...grupos.entries()];
  }, [parametros, busqueda]);

  if (cargando) return <Cargando texto="los ajustes" />;

  const buscando = busqueda.trim().length > 0;

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar los ajustes")}</Text>
        </Card>
      ) : null}

      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar un ajuste" />

      {porCategoria.map(([categoria, lista]) => {
        const desplegada = buscando || abierta === categoria;
        return (
          <Card key={categoria} className="p-0">
            <Pressable
              onPress={() => setAbierta(desplegada && !buscando ? null : categoria)}
              accessibilityRole="button"
              accessibilityLabel={CATEGORIAS[categoria] ?? categoria}
              aria-expanded={desplegada}
              accessibilityState={{ expanded: desplegada }}
              className="flex-row items-center justify-between p-4"
            >
              <Text className="text-base font-semibold text-gray-900">
                {`${CATEGORIAS[categoria] ?? categoria} (${lista.length})`}
              </Text>
              <Ionicons
                name={desplegada ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>

            {desplegada
              ? lista.map((p) => (
                  <Pressable
                    key={p.clave}
                    onPress={() => setEditando(p)}
                    accessibilityRole="button"
                    accessibilityLabel={p.descripcion}
                    className="border-t border-gray-100 px-4 py-3 active:opacity-70"
                  >
                    <Text className="text-sm text-gray-900">{p.descripcion || p.clave}</Text>
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-primary">{valorLegible(p)}</Text>
                      {p.riesgo === "alto" ? <Text className="text-xs text-warning">Riesgo alto</Text> : null}
                    </View>
                  </Pressable>
                ))
              : null}
          </Card>
        );
      })}

      <EditarAjuste parametro={editando} onClose={() => setEditando(null)} />
    </DesplazableConTeclado>
  );
}
