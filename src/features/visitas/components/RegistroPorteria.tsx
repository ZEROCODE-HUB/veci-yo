import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Toggle } from "@/shared/components";

interface RegistroPorteriaProps {
  /** Solo cuando la visita pide anunciar; si solo pide notificar, no hay nada que marcar. */
  pideAnuncio: boolean;
  anunciado: boolean;
  onToggleAnuncio?: () => void;

  llego: boolean;
  onToggleLlegada?: (registrada: boolean) => void;
  horaIngreso?: string;
  onEditarIngreso?: () => void;

  horaSalida?: string;
  onToggleSalida?: (registrada: boolean) => void;
  onEditarSalida?: () => void;
}

/**
 * Lo que la portería anota de una visita: si la anunció, cuándo entró y cuándo
 * salió.
 *
 * Estaba repartido en tres controles de tres formas distintas --un interruptor
 * para la llegada, una casilla para la salida al final de la ficha (después de
 * las anotaciones y las fotos) y, además, un botón "Salió" en el pie que hacía
 * lo mismo que la casilla--. Tres maneras de decir lo mismo y dos de ellas
 * lejos de la otra.
 *
 * Aquí las tres son la misma fila: lo que se anota a la izquierda, el estado
 * debajo, y un interruptor a la derecha. La hora aparece cuando hay algo que
 * mostrar y se toca para corregirla.
 */
export function RegistroPorteria({
  pideAnuncio,
  anunciado,
  onToggleAnuncio,
  llego,
  onToggleLlegada,
  horaIngreso,
  onEditarIngreso,
  horaSalida,
  onToggleSalida,
  onEditarSalida,
}: RegistroPorteriaProps) {
  return (
    <View
      className="gap-1 py-1"
      style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}
    >
      <Text className="text-xs font-semibold text-gray-400 pt-2 pb-1">
        REGISTRO DE PORTERÍA
      </Text>

      {pideAnuncio && (
        <Fila
          etiqueta="Anuncié al residente"
          /*
            Decia "Llamé / No lo anuncié", que son dos cosas contrarias en la
            misma etiqueta: no se sabia si marcarla significaba que habias
            llamado o que no lo habias anunciado.
          */
          estado={anunciado ? "Anunciado" : "Todavía no"}
          activo={anunciado}
          onChange={() => onToggleAnuncio?.()}
        />
      )}

      <Fila
        etiqueta="Registrar entrada"
        estado={llego ? "Entró" : "Sin registrar"}
        activo={llego}
        onChange={(v) => onToggleLlegada?.(v)}
        hora={llego ? horaIngreso : undefined}
        onEditarHora={onEditarIngreso}
      />

      <Fila
        etiqueta="Registrar salida"
        estado={horaSalida ? "Salió" : "Sin registrar"}
        activo={Boolean(horaSalida)}
        // Nadie sale de donde no entró: primero se registra la entrada.
        deshabilitado={!llego}
        onChange={(v) => onToggleSalida?.(v)}
        hora={horaSalida}
        onEditarHora={onEditarSalida}
      />
    </View>
  );
}

function Fila({
  etiqueta,
  estado,
  activo,
  deshabilitado = false,
  onChange,
  hora,
  onEditarHora,
}: {
  etiqueta: string;
  estado: string;
  activo: boolean;
  deshabilitado?: boolean;
  onChange: (valor: boolean) => void;
  hora?: string;
  onEditarHora?: () => void;
}) {
  return (
    <View
      className="flex-row items-center gap-3 py-2"
      style={{ opacity: deshabilitado ? 0.45 : 1 }}
    >
      <View className="flex-1">
        <Text className="text-sm text-gray-900">{etiqueta}</Text>
        <Text
          className="text-xs"
          style={{
            color: activo ? theme.colors.success : theme.colors.textMuted,
          }}
        >
          {estado}
        </Text>
      </View>

      {activo && onEditarHora && (
        <Pressable
          onPress={onEditarHora}
          className="flex-row items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5"
          hitSlop={6}
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={theme.colors.textSecondary}
          />
          <Text className="text-sm font-semibold text-gray-900">
            {hora || "--:--"}
          </Text>
        </Pressable>
      )}

      <Toggle value={activo} onChange={onChange} disabled={deshabilitado} />
    </View>
  );
}
