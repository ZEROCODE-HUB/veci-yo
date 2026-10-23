import { theme } from "@/config";
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { useAuthStore } from "@/stores";
import { zonaIcons2 } from "@/assets/icons/zonas";
import { claveDeIcono } from "../helpers/claveDeIcono";
import { useZonas } from "../hooks";
import { formatDateInput } from "@/shared/utils";
import { Button, Modal } from "@/shared/components";
import type { ReservaZona } from "@/shared/types";

const icons = zonaIcons2 as Record<string, ImageSourcePropType>;

export function MisReservas({
  collapsible = false,
  hideIfEmpty = false,
  soloDeHoy = false,
}: {
  collapsible?: boolean;
  hideIfEmpty?: boolean;
  /**
   * Solo las de hoy, para el bloque «Hoy» del inicio.
   *
   * Ese bloque metia esta lista entera debajo del titulo «Hoy», y la lista
   * trae todas las propias: una inquilina con una reserva de la piscina del 25
   * la veia ahi el 29, con «Mis reservas 1», como si fuera de hoy. En la
   * pantalla de Zonas se siguen queriendo todas, que es donde se viene a
   * mirarlas.
   */
  soloDeHoy?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const rol = useAuthStore((state) => state.rolActivo);
  const { reservas, zonasComunesConfig, eliminarReserva } = useZonas();
  /*
    Cancelar desde aquí (QA, T-088, 22/10/2026). Solo se podía tocando la
    reserva en la grilla del día, y el huésped la buscaba donde la ve: en «Mis
    reservas». No se pudo cancelar y no supo por qué.
  */
  const [aCancelar, setACancelar] = useState<ReservaZona | null>(null);

  /*
    El `return null` de la porteria y la administracion estaba **antes** del
    `useMemo`, o sea que este componente llamaba a menos hooks en unos roles
    que en otros. Mientras no se cambie de rol sin desmontar la pantalla no
    pasa nada; en cuanto se cambia, React tira «Rendered fewer hooks than
    expected» y la pantalla se cae entera.

    Y se cambia: Marcela pasa de administradora a propietaria de la 301 desde
    el selector de la cabecera, sin salir de donde este. El return se baja
    debajo de todos los hooks.
  */
  // `yyyy-MM-dd` de hoy, para comparar con `fechaIso` sin pasar por `Date`.
  const hoyIso = useMemo(() => {
    const d = new Date();
    return formatDateInput(d);
  }, []);

  const propias = useMemo(
    () =>
      reservas
        .filter(
          (reserva) =>
            reserva.esMia &&
            !["Cancelado", "Rechazado"].includes(reserva.estado) &&
            (!soloDeHoy || reserva.fechaIso === hoyIso),
        )
        // Por la fecha ISO: `fecha` esta en dd/MM/yyyy y ordenarla como texto
        // pondria el 15/11 antes que el 23/09.
        .sort((a, b) =>
          String(a.fechaIso || "").localeCompare(String(b.fechaIso || "")),
        ),
    [reservas, soloDeHoy, hoyIso],
  );

  /*
    Las rechazadas que todavía no han pasado. Una reserva rechazada
    **desaparecía** de «Mis reservas» sin una palabra: el vecino la había
    pedido, dejaba de verla, y no sabía ni que la habían rechazado ni por qué
    (13/10/2026).
  */
  const rechazadas = useMemo(
    () =>
      reservas.filter(
        (reserva) =>
          reserva.esMia &&
          reserva.estado === "Rechazado" &&
          String(reserva.fechaIso || "") >= hoyIso &&
          (!soloDeHoy || reserva.fechaIso === hoyIso),
      ),
    [reservas, soloDeHoy, hoyIso],
  );

  if (rol === "guardia" || rol === "administrador") return null;
  if (hideIfEmpty && propias.length === 0 && rechazadas.length === 0) {
    return null;
  }

  return (
    <View
      className="bg-white rounded-2xl p-4 gap-2.5"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Pressable
        onPress={collapsible ? () => setOpen((value) => !value) : undefined}
        className="flex-row items-center justify-between"
      >
        <Text className="text-lg font-bold text-gray-900">Mis reservas</Text>
        <View className="flex-row items-center gap-2">
          <Text
            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {propias.length}
          </Text>
          {collapsible && (
            <Text className="text-gray-500">{open ? "▲" : "▼"}</Text>
          )}
        </View>
      </Pressable>
      {open &&
        rechazadas.map((reserva) => (
          <View
            key={`rechazada-${reserva.id}`}
            className="rounded-xl bg-red-50 p-3 gap-0.5"
          >
            <Text className="text-sm font-semibold text-red-700">
              Reserva rechazada ·{" "}
              {zonasComunesConfig[reserva.zonaId]?.nombre ?? "Zona común"}
            </Text>
            <Text className="text-xs leading-5 text-red-700">
              {reserva.fecha} · {reserva.horario}
            </Text>
            <Text className="text-xs leading-5 text-gray-700">
              {reserva.motivoRechazo
                ? `Motivo: ${reserva.motivoRechazo}`
                : "La administración no indicó el motivo."}
            </Text>
          </View>
        ))}
      {open &&
        (propias.length === 0 ? (
          <Text className="text-sm text-gray-500">
            No tienes reservas activas.
          </Text>
        ) : (
          propias.map((reserva) => {
            const zona = zonasComunesConfig[reserva.zonaId];
            const icono =
              icons[reserva.zonaId] ?? (zona ? icons[claveDeIcono(zona) ?? ""] : undefined);
            return (
              <View
                key={reserva.id}
                className="flex-row items-center gap-3 py-2.5 border-t border-gray-100"
              >
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full">
                  {icono ? (
                    <Image
                      style={{ height: 40, width: 40 }}
                      source={icono}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-2xl">{zona?.emoji}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {zona?.nombre}
                  </Text>
                  {/*
                    Y que puesto toco. Aqui es donde se viene a mirarlo --es
                    «Mis reservas»-- y era justo donde no salia: la 102 tiene
                    tres reservas de lavanderia el mismo dia a la misma hora, y
                    sin el numero son tres renglones identicos.
                  */}
                  <Text className="text-xs text-gray-500">
                    {reserva.numeroRecurso
                      ? `${reserva.horario} · N°${reserva.numeroRecurso}`
                      : reserva.horario}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      color:
                        reserva.estado === "Aprobado"
                          ? theme.colors.success
                          : theme.colors.secondary,
                      backgroundColor:
                        reserva.estado === "Aprobado"
                          ? theme.colors.successLight
                          : theme.colors.infoBg,
                    }}
                  >
                    {reserva.estado}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {reserva.fecha || "Sin fecha"}
                  </Text>
                  {reserva.uuid ? (
                    <Pressable
                      onPress={() => setACancelar(reserva)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cancelar la reserva de ${zona?.nombre ?? "la zona"}`}
                      hitSlop={8}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.colors.danger }}
                      >
                        Cancelar
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        ))}
      <Modal
        visible={!!aCancelar}
        onClose={() => setACancelar(null)}
        title="Cancelar reserva"
      >
        <View className="gap-4">
          <Text className="text-sm text-gray-600 text-center">
            ¿Seguro que quieres cancelar esta reserva? La franja vuelve a quedar
            libre para otros vecinos.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button variant="secondary" onPress={() => setACancelar(null)}>
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                onPress={() => {
                  if (aCancelar?.uuid) eliminarReserva(aCancelar.uuid);
                  setACancelar(null);
                }}
              >
                Cancelar reserva
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
