import React from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components";
import { CalendarioDePlataforma } from "../CalendarioDePlataforma";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/**
 * Los calendarios (iCal) de las plataformas donde se publica el alojamiento.
 *
 * Aquí estaban también «Plataformas en las que está publicado», «Otras»,
 * «¿Quieres integrar con un PMS?» e «Integrar»: se guardaban y no hacían nada,
 * y se quitaron (hueco 18, 21/10/2026).
 */
export function CalendariosDePlataformas({ renta: r }: { renta: RentaCorta }) {
  const { enlaces, setEnlaces, calendario } = r;
  return (
    <SeccionDeConfiguracion
      titulo="Calendarios de tus plataformas"
      subtitulo="Pega el enlace de calendario (iCal) de cada plataforma donde publicas tu alojamiento y Veciyo trae tus reservas."
    >
      {/*
        Un calendario por plataforma (21/10/2026). Antes había un solo enlace,
        el de Airbnb, y quien publicaba también en Booking no tenía dónde poner
        el suyo.
      */}
      <View className="flex-col gap-4">
        <CalendarioDePlataforma
          nombre="Airbnb"
          plataforma="airbnb"
          ejemplo="https://www.airbnb.com/calendar/ical/..."
          valor={enlaces.airbnb}
          onCambiar={(airbnb) => setEnlaces({ ...enlaces, airbnb })}
          estado={calendario.de("airbnb")}
        />
        <CalendarioDePlataforma
          nombre="Booking"
          plataforma="booking"
          ejemplo="https://ical.booking.com/v1/export?t=..."
          valor={enlaces.booking}
          onCambiar={(booking) => setEnlaces({ ...enlaces, booking })}
          estado={calendario.de("booking")}
        />
        {/* Otra plataforma solo si ya hay una guardada: no se ofrece de entrada. */}
        {calendario.de("otra") || enlaces.otra ? (
          <CalendarioDePlataforma
            nombre="otra plataforma"
            plataforma="otra"
            ejemplo="https://..."
            valor={enlaces.otra}
            onCambiar={(otra) => setEnlaces({ ...enlaces, otra })}
            estado={calendario.de("otra")}
          />
        ) : null}

        {/*
          Desde el 09/10/2026 se leen solos. Se dice, porque si no el anfitrión
          sigue creyendo que tiene que pulsar el botón. No se dice cada cuánto:
          ese número se cambia desde la base.
        */}
        <View>
          {calendario.conectado ? (
            <Text className="text-xs text-gray-500">
              Veciyo los vuelve a leer solo, varias veces al día. No hace falta
              que pulses nada.
            </Text>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onPress={() => r.sincronizar.mutate()}
            disabled={!calendario.conectado || calendario.sincronizando}
            loading={calendario.sincronizando}
            fullWidth
            style={{ marginTop: 10 }}
          >
            {calendario.conectado
              ? "Traer mis reservas ahora"
              : "Guarda un enlace para poder traerlas"}
          </Button>
          <Text className="mt-2 text-xs leading-5 text-gray-400">
            Las plataformas solo mandan las fechas (Airbnb, además, el código de
            la reserva). El nombre y los datos del huésped los pone él mismo
            cuando abra su enlace de preregistro. En Booking, los días que
            cierres a mano también llegan como una reserva: si alguna no es
            real, cancélala.
          </Text>
        </View>
      </View>
    </SeccionDeConfiguracion>
  );
}
