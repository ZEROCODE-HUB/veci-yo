import React, { useState } from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";
import { formatDateIso } from "@/shared/utils";
import type { RentaCorta } from "./tipos";
import { ReservasQueQuedan } from "./ReservasQueQuedan";

/**
 * Darse de baja de la renta corta, con confirmación porque apaga un servicio
 * que se paga.
 *
 * `cancelarSuscripcion` llevaba escrita en el repositorio sin que ninguna
 * pantalla la llamara: se podía activar la renta corta y no había forma de
 * dejarla (punto 64 de `REVISAR-A-OJO.md`). Con la baja ya pedida no se vuelve
 * a ofrecer: se dice hasta cuándo sigue funcionando. Para volver a activarla
 * está el botón de suscribirse, que reaparece al vencer.
 */
export function BajaDeRentaCorta({ renta: r }: { renta: RentaCorta }) {
  const [mostrar, setMostrar] = useState(false);
  /*
    Las reservas que siguen después de que el servicio termine (hueco 47,
    27/10/2026): no se cancelan solas y el anfitrión tiene que saberlo.
  */
  const sinServicio = r.bajaProgramadaEn
    ? r.reservasPendientes.filter((p) => (p.hasta ?? "") > r.bajaProgramadaEn!.slice(0, 10))
    : [];
  return (
    <>
      {r.bajaProgramadaEn ? (
        <View className="gap-2 rounded-xl p-3.5" style={{ backgroundColor: theme.colors.warningSoft }}>
          <Text className="text-sm" style={{ color: theme.colors.badgeAmberText }}>
            Diste de baja la renta corta. Sigue funcionando hasta el{" "}
            {formatDateIso(r.bajaProgramadaEn)}.
          </Text>
          {sinServicio.length > 0 ? (
            <ReservasQueQuedan
              titulo={`Ojo: ${sinServicio.length === 1 ? "esta reserva sigue" : "estas reservas siguen"} después de esa fecha, sin servicio. Cancélalas o avisa a tus huéspedes.`}
              reservas={sinServicio}
            />
          ) : null}
        </View>
      ) : (
        <Button variant="ghost" onPress={() => setMostrar(true)} disabled={r.dandoDeBaja}>
          {r.dandoDeBaja ? "Dando de baja…" : "Dar de baja la renta corta"}
        </Button>
      )}

      <Modal visible={mostrar} onClose={() => setMostrar(false)} title="Dar de baja la renta corta">
        <View className="gap-4">
          <Text className="text-sm text-gray-600" style={{ lineHeight: 20 }}>
            Esta vivienda deja de aceptar huéspedes temporales. La configuración y
            el libro del alojamiento se guardan, así que si vuelves a activarla no
            hay que rellenarlo otra vez.
          </Text>
          <Text className="text-xs text-gray-500">
            Si el mes ya está pagado, sigue funcionando hasta que termine. Las
            reservas que ya tengas hechas no se cancelan solas.
          </Text>
          {r.reservasPendientes.length > 0 ? (
            <ReservasQueQuedan
              titulo={`Tienes ${r.reservasPendientes.length} ${r.reservasPendientes.length === 1 ? "reserva" : "reservas"} por delante:`}
              reservas={r.reservasPendientes}
            />
          ) : null}
          <Button
            variant="danger"
            fullWidth
            disabled={r.dandoDeBaja}
            onPress={() => {
              r.darDeBaja();
              setMostrar(false);
            }}
          >
            Dar de baja
          </Button>
          <Button variant="ghost" fullWidth onPress={() => setMostrar(false)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </>
  );
}
