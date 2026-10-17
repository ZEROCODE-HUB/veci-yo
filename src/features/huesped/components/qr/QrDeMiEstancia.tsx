import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Button } from "@/shared/components";
import { useUIStore } from "@/stores";
import { formatDateIso, mensajeDeError } from "@/shared/utils";
import type { CodigoDeAcceso } from "../../services/huesped.service";
import { compartirQr, PREFIJO_QR } from "./compartirQr";

/**
 * El QR de la estancia, para enseñarlo en portería (14/10/2026).
 *
 * Lo pidió la responsable de producto: al huésped con cuenta le aparece su QR
 * y lo puede compartir como imagen, «como un pasabordo». El Wallet del
 * teléfono queda para cuando haya cuentas de Apple y Google.
 *
 * El QR no es una llave: sirve para que la portería encuentre la estancia.
 */
export function QrDeMiEstancia({ acceso }: { acceso: CodigoDeAcceso }) {
  const { addToast } = useUIStore();
  const [compartiendo, setCompartiendo] = useState(false);
  const ref = useRef<{ toDataURL: (cb: (b64: string) => void) => void } | null>(null);

  const compartir = async () => {
    setCompartiendo(true);
    try {
      const png = await new Promise<string | undefined>((listo) => {
        if (!ref.current?.toDataURL) return listo(undefined);
        try {
          ref.current.toDataURL((b64) => listo(b64));
        } catch {
          listo(undefined);
        }
      });
      const resultado = await compartirQr(acceso.codigo, `veciyo-qr-${acceso.unidad}`, png);
      if (resultado === "descargado") addToast("QR descargado", "success");
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo compartir el QR"), "error");
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <View className="items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <Text className="text-base font-bold text-gray-900">Tu QR de entrada</Text>
      <Text className="text-xs text-gray-600 text-center">
        Enséñalo al personal de seguridad al llegar. {acceso.condominio} · vivienda {acceso.unidad}
      </Text>
      <View className="rounded-xl bg-white p-3">
        <QRCode
          value={`${PREFIJO_QR}${acceso.codigo}`}
          size={200}
          getRef={(c) => {
            ref.current = c as unknown as typeof ref.current;
          }}
        />
      </View>
      {/* Por si la cámara de la portería no lo lee: lo teclea. */}
      <Text className="text-sm font-bold tracking-widest text-gray-900">{acceso.codigo}</Text>
      <Text className="text-xs text-gray-500">
        Del {formatDateIso(acceso.fechaDesde)} al {formatDateIso(acceso.fechaHasta)}
      </Text>
      <Button variant="secondary" loading={compartiendo} onPress={compartir}>
        Compartir como imagen
      </Button>
    </View>
  );
}
