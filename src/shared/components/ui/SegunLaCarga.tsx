import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Cargando } from "./Cargando";
import type { FormaDelEsqueleto } from "./Esqueleto";

/**
 * Lo que una pantalla enseña mientras espera sus datos, si no llegan, y cuando
 * llegan (13/11/2026, cliente: «en muchas pantallas no hay estados de
 * carga»).
 *
 * Existe porque la revisión de ese día encontró el mismo defecto en unas
 * noventa pantallas, de tres formas:
 *
 *   · **mientras carga, dice que no hay nada**: «No hay visitas», «Sin
 *     propietario», «No pagado». La lista vacía y la lista que todavía no
 *     llegó se pintaban igual;
 *   · **si la carga falla, dice que no hay nada para siempre**: casi ninguna
 *     pantalla miraba el error, así que una red caída se leía como un edificio
 *     sin datos;
 *   · y nadie podía **volver a intentarlo** sin salir de la pantalla.
 *
 * El orden importa y es el que está escrito: primero lo que ya hay (si hay
 * datos de antes, se enseñan aunque se esté recargando), después la carga,
 * después el fallo, y el contenido —que incluye su propio «no hay nada»— solo
 * cuando la respuesta llegó.
 */
export interface EstadoDeLaCarga {
  /** Todavía no ha llegado la primera respuesta. */
  cargando: boolean;
  /** La última respuesta fue un error y no hay datos de antes. */
  fallo?: boolean;
  /** Volver a pedirlo. Sin esto, el aviso de fallo no ofrece el botón. */
  reintentar?: () => unknown;
}

/**
 * De una consulta de TanStack Query a lo que necesita `SegunLaCarga`.
 *
 * `isLoading` y no `isPending`: una consulta apagada (`enabled: false`, porque
 * todavía no hay vivienda elegida, por ejemplo) está «pendiente» para siempre
 * y no está cargando nada.
 */
export function estadoDe(consulta: {
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  data?: unknown;
  refetch: () => unknown;
}): EstadoDeLaCarga {
  const sinDatos = consulta.data === undefined;
  // Tras un fallo, «Reintentar» vuelve a pedir y la consulta sigue en error
  // mientras tanto: sin esto, el botón no daría ninguna señal de que algo pasa.
  const reintentando = consulta.isError && Boolean(consulta.isFetching) && sinDatos;
  return {
    cargando: consulta.isLoading || reintentando,
    fallo: consulta.isError && sinDatos && !reintentando,
    reintentar: () => consulta.refetch(),
  };
}

/** Junta varias consultas: carga mientras cualquiera cargue, falla si falla alguna. */
export function juntarCargas(...estados: EstadoDeLaCarga[]): EstadoDeLaCarga {
  return {
    cargando: estados.some((e) => e.cargando),
    fallo: estados.some((e) => e.fallo),
    reintentar: () => {
      for (const e of estados) if (e.fallo || !e.cargando) e.reintentar?.();
    },
  };
}

export function ErrorAlCargar({
  texto,
  reintentar,
  enLinea = false,
}: {
  /** Qué no se pudo cargar: «tus visitas». */
  texto?: string;
  reintentar?: () => unknown;
  enLinea?: boolean;
}) {
  return (
    <View
      className={
        enLinea
          ? "items-center gap-2 rounded-2xl bg-white p-4"
          : "flex-1 items-center justify-center gap-3 p-8"
      }
      role="alert"
    >
      <Ionicons name="cloud-offline-outline" size={enLinea ? 22 : 36} color={theme.colors.textMuted} />
      <Text className="text-center text-sm" style={{ color: theme.colors.textSecondary }}>
        {texto ? `No se pudo cargar ${texto}.` : "No se pudo cargar."} Revisa tu conexión.
      </Text>
      {reintentar ? (
        <Pressable
          onPress={() => void reintentar()}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          className="rounded-full px-5 py-2"
          style={{ backgroundColor: theme.colors.primaryLight }}
        >
          <Text className="text-sm font-semibold" style={{ color: theme.colors.primaryDark }}>
            Reintentar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SegunLaCarga({
  estado,
  texto,
  forma,
  cuantos,
  enLinea = false,
  children,
}: {
  estado: EstadoDeLaCarga;
  /** Qué se carga: «tus visitas». Lo usan la silueta y el aviso de fallo. */
  texto?: string;
  forma?: FormaDelEsqueleto;
  cuantos?: number;
  /** Para un trozo dentro de una pantalla, no la pantalla entera. */
  enLinea?: boolean;
  children: ReactNode;
}) {
  if (estado.fallo) {
    return <ErrorAlCargar texto={texto} reintentar={estado.reintentar} enLinea={enLinea} />;
  }
  if (estado.cargando) {
    return (
      <Cargando
        texto={texto}
        variante={enLinea ? "enLinea" : "completo"}
        forma={forma}
        cuantos={cuantos}
      />
    );
  }
  return <>{children}</>;
}
