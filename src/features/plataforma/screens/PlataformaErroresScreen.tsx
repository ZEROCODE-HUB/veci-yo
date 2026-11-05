import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import { Cargando } from "@/shared/components";
import { Card } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import { plural } from "@/shared/utils/plural.util";
import { DIAS_DE_ERRORES, useErroresDeLaApp, useVecesDeUnError } from "../hooks/useErroresDeLaApp";
import type { GrupoDeErrores, TipoDeAnotacion } from "../services/erroresDeLaApp.repo";

const PESTANAS: { tipo: TipoDeAnotacion; titulo: string }[] = [
  { tipo: "error", titulo: "Errores" },
  { tipo: "rastro", titulo: "Rastros" },
];

/**
 * Los errores de la app que anotan los celulares (05/11/2026).
 *
 * Desde el 26/10/2026 la app guarda en la base lo que revienta una pantalla y
 * los pasos de lo delicado (el escaneo del documento, el cambio de rol), pero
 * solo se leía a mano. Aquí se ven agrupados por dónde pasaron, de los últimos
 * siete días, y al abrir un grupo, sus últimas veces.
 *
 * **Sin decir de quién**: el panel no ve nada de una persona concreta (alcance
 * del rol, 02/10/2026). Se dice a cuántas cuentas les pasó, no a cuáles.
 *
 * «Rastros» no son fallos: son los pasos que la app anota a propósito para
 * saber dónde se quedó un celular. Van aparte para que no tapen los errores.
 */
export function PlataformaErroresScreen() {
  const [tipo, setTipo] = useState<TipoDeAnotacion>("error");
  const [abierto, setAbierto] = useState<string | null>(null);
  const { grupos, cargando, error, refrescar, refrescando } = useErroresDeLaApp(tipo);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} />}
    >
      <View className="flex-row gap-2" accessibilityRole="tablist">
        {PESTANAS.map((p) => {
          const elegida = p.tipo === tipo;
          return (
            <Pressable
              key={p.tipo}
              onPress={() => {
                setTipo(p.tipo);
                setAbierto(null);
              }}
              accessibilityRole="tab"
              accessibilityLabel={p.titulo}
              accessibilityState={{ selected: elegida }}
              aria-selected={elegida}
              className="flex-1 items-center rounded-full py-2 active:opacity-70"
              style={{ backgroundColor: elegida ? theme.colors.text : theme.colors.border }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: elegida ? theme.colors.textInverse : theme.colors.textSecondary }}
              >
                {p.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-xs text-gray-500">
        {`Últimos ${DIAS_DE_ERRORES} días, agrupados por dónde pasaron. Sin datos de las personas: solo a cuántas cuentas les pasó. Desliza hacia abajo para refrescar.`}
      </Text>

      {cargando ? <Cargando texto="los errores" variante="enLinea" /> : null}

      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">
            {mensajeDeError(error, "No se pudieron cargar los errores")}
          </Text>
        </Card>
      ) : null}

      {!cargando && !error && grupos.length === 0 ? (
        <Card className="p-4">
          <Text className="text-sm text-gray-500">
            {tipo === "error"
              ? `Ningún error en los últimos ${DIAS_DE_ERRORES} días.`
              : `Ningún rastro en los últimos ${DIAS_DE_ERRORES} días.`}
          </Text>
        </Card>
      ) : null}

      {grupos.map((g) => (
        <GrupoDeLaLista
          key={g.donde}
          grupo={g}
          tipo={tipo}
          abierto={abierto === g.donde}
          onPress={() => setAbierto(abierto === g.donde ? null : g.donde)}
        />
      ))}
    </ScrollView>
  );
}

function GrupoDeLaLista({
  grupo,
  tipo,
  abierto,
  onPress,
}: {
  grupo: GrupoDeErrores;
  tipo: TipoDeAnotacion;
  abierto: boolean;
  onPress: () => void;
}) {
  return (
    <Card className="p-0">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${grupo.donde}, ${plural(grupo.veces, "vez", "veces")}`}
        accessibilityState={{ expanded: abierto }}
        aria-expanded={abierto}
        className="gap-1 p-4 active:opacity-70"
      >
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-sm font-semibold text-gray-900">{grupo.donde}</Text>
          <Text className="text-sm font-bold" style={{ color: theme.colors.dangerDark }}>
            {grupo.veces}
          </Text>
        </View>
        <Text className="text-xs text-gray-500">
          {`${plural(grupo.cuentas, "cuenta")} · última vez ${grupo.ultimaVez}`}
        </Text>
        {grupo.ultimoMensaje ? (
          <Text className="text-xs text-gray-700" numberOfLines={abierto ? undefined : 2}>
            {grupo.ultimoMensaje}
          </Text>
        ) : null}
        <Text className="text-2xs text-gray-400">
          {[...grupo.versiones, ...grupo.plataformas].join(" · ")}
        </Text>
        <Text className="text-xs font-semibold" style={{ color: theme.colors.secondary }}>
          {abierto ? "Ocultar las últimas veces" : "Ver las últimas veces"}
        </Text>
      </Pressable>
      {abierto ? <VecesDelGrupo donde={grupo.donde} tipo={tipo} /> : null}
    </Card>
  );
}

function VecesDelGrupo({ donde, tipo }: { donde: string; tipo: TipoDeAnotacion }) {
  const { veces, cargando, error } = useVecesDeUnError(donde, tipo);
  if (cargando) return <Cargando texto="las últimas veces" variante="enLinea" />;
  if (error) {
    return (
      <Text className="px-4 pb-4 text-xs text-danger">
        {mensajeDeError(error, "No se pudieron cargar")}
      </Text>
    );
  }
  return (
    <View className="gap-2 border-t border-gray-100 p-4">
      {veces.map((v, i) => (
        <View key={`${v.creadoEn}-${i}`} className="gap-0.5">
          <Text className="text-xs font-semibold text-gray-700">
            {[v.creadoEn, v.version, v.plataforma].filter(Boolean).join(" · ")}
          </Text>
          {v.mensaje ? <Text className="text-xs text-gray-700">{v.mensaje}</Text> : null}
          {v.detalle ? (
            <Text className="text-2xs text-gray-500" numberOfLines={6}>
              {v.detalle}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
