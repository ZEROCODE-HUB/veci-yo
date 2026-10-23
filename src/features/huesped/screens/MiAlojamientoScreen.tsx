import { ScrollView, Text, View } from "react-native";
import { AlojamientoHero, AlojamientoInfoChips } from "../components/alojamiento";
import {
  LibroHuespedContenido,
  LibroHuespedVacio,
} from "../components/libroHuesped";
import { useMiAlojamiento } from "../hooks/useMiAlojamiento";
import { Button, Cargando } from "@/shared/components";
import { QrDeMiEstancia } from "../components/qr/QrDeMiEstancia";

export function MiAlojamientoScreen() {
  const {
    ubicacionActiva,
    unidad,
    tipologia,
    config,
    guestbook,
    hasGuestbook,
    llegadaPendiente,
    cargando,
    falloLaFicha,
    falloElLibro,
    reintentar,
    acceso,
    accesoCargado,
  } = useMiAlojamiento();

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      <AlojamientoHero
        ubicacion={ubicacionActiva}
        unidad={unidad}
        descripcion={config?.descripcion || ""}
      />

      {/* El QR para la portería, en cuanto el preregistro está cerrado. */}
      {acceso ? <QrDeMiEstancia acceso={acceso} /> : null}
      {/*
        Sin QR no se quedaba nada en su lugar, y el huésped no sabía si
        faltaba algo o si no existía (QA 23/10/2026).
      */}
      {!acceso && accesoCargado ? (
        <View className="gap-1 rounded-xl bg-white p-4">
          <Text className="text-sm font-bold text-gray-900">Tu QR de entrada</Text>
          <Text className="text-xs leading-5 text-gray-600">
            Aparece aquí cuando el preregistro de tu reserva esté completo, y se
            quita cuando la estancia termina.
          </Text>
        </View>
      ) : null}

      {/* Sin suscripcion de renta corta no hay ficha; antes se mostraba una
          inventada, la misma para cualquier vivienda. */}
      {/*
        Un fallo de lectura no es «no hay nada»: se dice, y se ofrece volver a
        intentarlo.
      */}
      {!cargando && (falloLaFicha || falloElLibro) ? (
        <View className="gap-2.5 rounded-xl bg-amber-100 p-3">
          <Text className="text-sm leading-5 text-amber-800">
            No pudimos leer los datos de tu alojamiento. Revisa tu conexión y
            vuelve a intentarlo.
          </Text>
          <Button variant="secondary" fullWidth onPress={reintentar}>
            Reintentar
          </Button>
        </View>
      ) : null}

      {cargando ? (
        <Cargando variante="enLinea" texto="tu alojamiento" />
      ) : falloLaFicha ? null : config ? (
        <AlojamientoInfoChips config={config} tipologia={tipologia} />
      ) : (
        <Text className="text-sm text-gray-500">
          Esta vivienda todavía no tiene ficha de alojamiento.
        </Text>
      )}

      {/*
        Mientras carga no se dice que esta vacio: decirlo es afirmar que el
        anfitrion no ha subido nada, y al entrar por primera vez eso era falso.
      */}
      {cargando || falloElLibro ? null : !hasGuestbook || !guestbook ? (
        <LibroHuespedVacio disponibleDesde={llegadaPendiente} />
      ) : (
        <LibroHuespedContenido libro={guestbook} />
      )}
    </ScrollView>
  );
}
