import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Input, Select } from "@/shared/components";
import type { PersonaReserva, ReservaZona } from "@/shared/types";
import { mensajeDeError } from "@/shared/utils/error.util";

/**
 * «Editar personas en la reserva», como en la maqueta (15/10/2026,
 * `_prototipo-web/src/features/zonas/ZonaDetallesPage.jsx`).
 *
 * La portería marca, persona por persona, si ya llegó o si ya salió, corrige
 * el nombre y el tipo, y cuando alguien sale anota quién entra en su lugar.
 * Antes solo dejaba cambiar nombres, y una reserva sin acompañantes abría la
 * ventana vacía.
 */

const TIPOS = ["Residente", "Visitante", "Huésped Temporal"];

const PASOS: { etiqueta: string; valor: PersonaReserva["llego"]; color: string }[] = [
  { etiqueta: "Reservado", valor: false, color: theme.colors.secondary },
  { etiqueta: "Llegó", valor: true, color: theme.colors.success },
  { etiqueta: "Salió", valor: "salio", color: theme.colors.textSecondary },
];

const fondoDe = (llego: PersonaReserva["llego"]) =>
  llego === true
    ? theme.colors.successLight
    : llego === "salio"
      ? theme.colors.bgMuted
      : theme.colors.secondaryLight;

interface Props {
  reserva: ReservaZona;
  guardando: boolean;
  onGuardar: (personas: PersonaReserva[]) => Promise<void>;
}

type Fila = PersonaReserva & { reemplazo?: boolean };

export function RegistroDeAsistentes({ reserva, guardando, onGuardar }: Props) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [reemplazos, setReemplazos] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    setFilas(reserva.personas.map((p) => ({ ...p })));
    setReemplazos({});
    setError("");
  }, [reserva]);

  const cambiar = (indice: number, cambio: Partial<Fila>) =>
    setFilas((actual) =>
      actual.map((fila, i) => (i === indice ? { ...fila, ...cambio } : fila)),
    );

  const reemplazar = (indice: number) => {
    const nombre = (reemplazos[indice] ?? "").trim();
    if (!nombre) return;
    setFilas((actual) => [
      ...actual,
      { nombre, llego: true, tipoParticipante: "Visitante", reemplazo: true },
    ]);
    setReemplazos((actual) => ({ ...actual, [indice]: "" }));
  };

  return (
    <View className="gap-4">
      <View className="rounded-2xl border-[1.5px] border-primary p-3.5 gap-1.5">
        <Text className="text-base font-bold text-gray-900">
          {reserva.solicitante ? `${reserva.depto} · ${reserva.solicitante}` : reserva.depto}
        </Text>
        <Text className="text-sm text-gray-500">
          {reserva.reservaNum ? `Reserva N°:${reserva.reservaNum} · ` : ""}
          {reserva.horario}
        </Text>
        <Text className="text-sm text-gray-500">
          {`Total personas: ${filas.length}`}
        </Text>
      </View>

      <Text className="text-sm font-semibold text-gray-900">
        Registro de asistentes
      </Text>

      {filas.length === 0 ? (
        <Text className="text-sm text-gray-600">
          Esta reserva no tiene personas anotadas: quien reservó no añadió
          acompañantes.
        </Text>
      ) : null}

      {filas.map((fila, indice) => (
        <View
          key={fila.uuid ?? `nueva-${indice}`}
          className="gap-2 rounded-xl border border-gray-200 p-3"
          style={{ backgroundColor: fondoDe(fila.llego) }}
        >
          <View className="flex-row items-start gap-2">
            <View className="flex-1">
              <Input
                value={fila.nombre}
                onChangeText={(nombre) => cambiar(indice, { nombre })}
                placeholder={
                  indice === 0 ? "Nombre del titular" : `Nombre del asistente ${indice + 1}`
                }
                showEditIcon={false}
              />
            </View>
            <View style={{ width: 150 }}>
              <Select
                value={fila.tipoParticipante || "Residente"}
                options={TIPOS}
                onChange={(tipo) => cambiar(indice, { tipoParticipante: String(tipo) })}
              />
            </View>
          </View>

          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-gray-500">
                {indice === 0 ? "Titular" : `Asistente ${indice + 1}`}
              </Text>
              {fila.reemplazo ? (
                <Text
                  className="rounded-full px-1.5 text-2xs font-semibold"
                  style={{
                    backgroundColor: theme.colors.secondaryLight,
                    color: theme.colors.secondaryDark,
                  }}
                >
                  Reemplazo
                </Text>
              ) : null}
            </View>
            <View className="flex-row gap-1" accessibilityRole="radiogroup">
              {PASOS.map((paso) => {
                const activo = fila.llego === paso.valor;
                return (
                  <Pressable
                    key={paso.etiqueta}
                    accessibilityRole="radio"
                    accessibilityLabel={`${fila.nombre || "Persona"}: ${paso.etiqueta}`}
                    aria-checked={activo}
                    accessibilityState={{ checked: activo }}
                    onPress={() => cambiar(indice, { llego: paso.valor })}
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: activo ? paso.color : theme.colors.bgCard,
                      borderWidth: activo ? 0 : 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text
                      className="text-2xs font-semibold"
                      style={{ color: activo ? theme.colors.bgCard : theme.colors.textSecondary }}
                    >
                      {paso.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {fila.llego === "salio" ? (
            <View className="flex-row items-center gap-1.5">
              <View className="flex-1">
                <Input
                  value={reemplazos[indice] ?? ""}
                  onChangeText={(texto) =>
                    setReemplazos((actual) => ({ ...actual, [indice]: texto }))
                  }
                  placeholder="Nombre del reemplazo"
                  showEditIcon={false}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!(reemplazos[indice] ?? "").trim()}
                onPress={() => reemplazar(indice)}
                className="rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: (reemplazos[indice] ?? "").trim()
                    ? theme.colors.success
                    : theme.colors.bgMuted,
                }}
              >
                <Text
                  className="text-2xs font-semibold"
                  style={{
                    color: (reemplazos[indice] ?? "").trim()
                      ? theme.colors.bgCard
                      : theme.colors.textMuted,
                  }}
                >
                  + Reemplazar
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <Button
        fullWidth
        loading={guardando}
        onPress={() => {
          setError("");
          onGuardar(filas).catch((fallo) =>
            setError(mensajeDeError(fallo, "No se pudo guardar la asistencia.")),
          );
        }}
      >
        Guardar
      </Button>
    </View>
  );
}
