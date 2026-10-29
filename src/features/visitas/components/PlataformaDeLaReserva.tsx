import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { LogoDePlataforma } from "@/shared/components";
import type { PlataformaReserva } from "@/shared/types";
import { useLista } from "@/shared/hooks/useLista";

/**
 * De dónde viene una reserva y cómo entró el dato.
 *
 * La responsable de producto (16/10/2026): «logo de Airbnb o Booking si vienen
 * del calendario, o Directo si es nuestro», y «fuente y método de ingreso del
 * dato». La fuente es `plataforma`; el método, `origen` (calendario o a mano).
 *
 * Airbnb y Booking van con su logo oficial (hueco 5, 21/10/2026: «usar logos
 * oficiales»); los dibujos están en `logos.generado.ts`. «Otro» sigue siendo
 * texto: no es una marca.
 *
 * Los nombres y cuáles se ofrecen al crear una reserva son la lista
 * `plataformas_de_reserva` de la base (Panel › Más › Listas, 28/10/2026). Los
 * códigos son un enum de la base, así que no se agregan desde el panel.
 */

const COLOR: Record<PlataformaReserva, string> = {
  airbnb: theme.colors.marcaAirbnb,
  booking: theme.colors.marcaBooking,
  directo: theme.colors.primary,
  otra: theme.colors.textMuted,
};

interface DistintivoProps {
  plataforma?: PlataformaReserva;
  /** `calendario` o `veciyo` (a mano). */
  origen?: "veciyo" | "calendario";
  /** Con la línea de «fuente y método», para la ficha. */
  conDetalle?: boolean;
}

/** El logo de la plataforma, o su nombre si no es una marca. */
function Marca({ plataforma, alto, color }: { plataforma: PlataformaReserva; alto: number; color?: string }) {
  const { etiquetaDe } = useLista("plataformas_de_reserva");
  if (plataforma === "airbnb" || plataforma === "booking") {
    return <LogoDePlataforma plataforma={plataforma} alto={alto} />;
  }
  return (
    <Text className="text-2xs font-bold" style={{ color: color ?? theme.colors.text }}>
      {etiquetaDe(plataforma)}
    </Text>
  );
}

export function DistintivoDePlataforma({ plataforma, origen, conDetalle }: DistintivoProps) {
  const { etiquetaDe } = useLista("plataformas_de_reserva");
  if (!plataforma) return null;
  const metodo = origen === "calendario" ? "Calendario (automático)" : "A mano";
  const conLogo = plataforma === "airbnb" || plataforma === "booking";
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <View
        className="rounded-full px-2.5 py-1"
        style={
          conLogo
            ? { backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.borderLight }
            : { backgroundColor: COLOR[plataforma] }
        }
      >
        <Marca
          plataforma={plataforma}
          alto={12}
          color={plataforma === "directo" ? theme.colors.text : theme.colors.textInverse}
        />
      </View>
      {conDetalle ? (
        <Text className="text-2xs text-gray-500">
          Fuente: {etiquetaDe(plataforma)} · Ingreso: {metodo}
        </Text>
      ) : null}
    </View>
  );
}

interface SelectorProps {
  valor: PlataformaReserva;
  onCambiar: (valor: PlataformaReserva) => void;
}

/** Al crear una reserva a mano: de qué plataforma viene. */
export function SelectorDePlataforma({ valor, onCambiar }: SelectorProps) {
  // «Otra plataforma» existe para lo que llega del calendario y no se ofrece
  // al crear (`extra.se_ofrece_al_crear`).
  const lista = useLista("plataformas_de_reserva");
  const opciones = lista.opciones
    .filter((o) => o.extra.se_ofrece_al_crear !== false)
    .map((o) => o.codigo as PlataformaReserva);
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-900">
        ¿De dónde viene la reserva?
      </Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {opciones.map((opcion) => {
          const elegida = valor === opcion;
          return (
            <Pressable
              key={opcion}
              onPress={() => onCambiar(opcion)}
              accessibilityRole="radio"
              accessibilityLabel={lista.etiquetaDe(opcion)}
              accessibilityState={{ checked: elegida }}
              aria-checked={elegida}
              className="flex-1 items-center justify-center rounded-full py-2"
              style={{
                borderWidth: elegida ? 2 : 1,
                borderColor: elegida ? COLOR[opcion] : theme.colors.borderStrong,
                backgroundColor: theme.colors.bgCard,
                opacity: elegida ? 1 : 0.7,
              }}
            >
              <Marca
                plataforma={opcion}
                alto={16}
                color={elegida ? theme.colors.text : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
