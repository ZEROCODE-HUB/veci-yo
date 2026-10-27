import React from "react";
import { View } from "react-native";
import { CampoHora, Toggle } from "@/shared/components";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/**
 * El horario de entrada de **esta** vivienda, no el del edificio.
 *
 * Las tres columnas existían desde la primera migración, el huésped ya las veía
 * en «Mi alojamiento» y el edificio ya las limitaba — y no había ninguna
 * pantalla donde el anfitrión las pusiera. Pedido por el cliente el 02/10/2026.
 */
export function HorarioDeEntrada({ renta: r }: { renta: RentaCorta }) {
  const { checkin, setCheckin } = r;
  return (
    <SeccionDeConfiguracion
      titulo="Horario de entrada"
      subtitulo="A qué horas puede llegar un huésped a tu vivienda. Lo ve él antes de viajar, y la portería al recibirlo."
    >
      <Toggle
        value={checkin.todoElDia}
        onChange={(valor) => setCheckin((previo) => ({ ...previo, todoElDia: valor }))}
        labelRight="Puede entrar a cualquier hora"
      />

      {/*
        Las horas desaparecen si se entra a cualquier hora: dejarlas visibles y
        sin efecto es la casilla decorativa de siempre.
      */}
      {!checkin.todoElDia && (
        <View className="mt-4 flex-row gap-2.5">
          <View className="flex-1">
            <CampoHora
              label="Desde"
              value={checkin.desde}
              onChange={(hora) => setCheckin((previo) => ({ ...previo, desde: hora }))}
              placeholder="15:00"
            />
          </View>
          <View className="flex-1">
            <CampoHora
              label="Hasta"
              value={checkin.hasta}
              onChange={(hora) => setCheckin((previo) => ({ ...previo, hasta: hora }))}
              /* La base rechaza una franja que termina antes de empezar. */
              minima={checkin.desde || undefined}
              placeholder="22:00"
            />
          </View>
        </View>
      )}
    </SeccionDeConfiguracion>
  );
}
