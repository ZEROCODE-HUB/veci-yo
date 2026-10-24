import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Input } from "@/shared/components/ui";
import { formatDate } from "@/shared/utils";

interface Props {
  entrada: Date | null;
  salida: Date | null;
  onRango: (desde: Date, hasta: Date | null) => void;
  minNoches: number;
  maxNoches: number | null;
  /** Noches ya reservadas, en `yyyy-MM-dd`. */
  ocupados?: Set<string>;
}

const dos = (n: number) => String(n).padStart(2, "0");
const clave = (f: Date) => `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
const noches = (a: Date, b: Date) =>
  Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / 86400000);

/** «24102026» → «24/10/2026» mientras se escribe. */
export function conBarras(texto: string): string {
  const cifras = texto.replace(/\D/g, "").slice(0, 8);
  if (cifras.length <= 2) return cifras;
  if (cifras.length <= 4) return `${cifras.slice(0, 2)}/${cifras.slice(2)}`;
  return `${cifras.slice(0, 2)}/${cifras.slice(2, 4)}/${cifras.slice(4)}`;
}

/** `dd/MM/yyyy` → fecha, o `null` si no es un día que exista. */
export function leerFecha(texto: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const [d, mes, anio] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(anio, mes - 1, d);
  return f.getFullYear() === anio && f.getMonth() === mes - 1 && f.getDate() === d ? f : null;
}

/**
 * Las fechas de la estancia, escritas (24/10/2026): «que tenga para
 * seleccionar fechas escribiendo», pidió el cliente. Van junto al calendario y
 * los dos dicen lo mismo: lo que se escribe se marca en el calendario y lo que
 * se pulsa en el calendario aparece aquí. Comprueba lo mismo que el
 * calendario --que no haya pasado, que no pise otra reserva, las noches
 * mínimas y máximas-- y dice qué falla en vez de no hacer nada.
 */
export function FechasEscritas({ entrada, salida, onRango, minNoches, maxNoches, ocupados }: Props) {
  const [llegada, setLlegada] = useState(entrada ? formatDate(entrada) : "");
  const [vuelta, setVuelta] = useState(salida ? formatDate(salida) : "");
  const [errorLlegada, setErrorLlegada] = useState<string | undefined>();
  const [errorSalida, setErrorSalida] = useState<string | undefined>();

  // Lo que se pulsa en el calendario aparece aquí.
  useEffect(() => {
    setLlegada(entrada ? formatDate(entrada) : "");
    setErrorLlegada(undefined);
  }, [entrada]);
  useEffect(() => {
    setVuelta(salida ? formatDate(salida) : "");
    setErrorSalida(undefined);
  }, [salida]);

  const problemaDeLlegada = (f: Date): string | undefined => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (f < hoy) return "Ese día ya pasó";
    const noche = new Date(f);
    for (let i = 0; i < Math.max(1, minNoches); i += 1) {
      if (ocupados?.has(clave(noche))) {
        return i === 0 ? "Ese día ya está reservado" : `No caben ${minNoches} noches antes de otra reserva`;
      }
      noche.setDate(noche.getDate() + 1);
    }
    return undefined;
  };

  const problemaDeSalida = (desde: Date, hasta: Date): string | undefined => {
    const n = noches(desde, hasta);
    if (n < 1) return "La salida es al menos el día siguiente a la llegada";
    if (n < minNoches) return `Mínimo ${minNoches} noches`;
    if (maxNoches != null && n > maxNoches) return `Máximo ${maxNoches} noches`;
    const noche = new Date(desde);
    while (noche < hasta) {
      if (ocupados?.has(clave(noche))) return "Hay otra reserva en medio de esas fechas";
      noche.setDate(noche.getDate() + 1);
    }
    return undefined;
  };

  const alEscribirLlegada = (texto: string) => {
    const valor = conBarras(texto);
    setLlegada(valor);
    setErrorLlegada(undefined);
    if (valor.length < 10) return;
    const f = leerFecha(valor);
    const problema = f ? problemaDeLlegada(f) : "Esa fecha no existe";
    if (!f || problema) {
      setErrorLlegada(problema);
      return;
    }
    const s = leerFecha(vuelta);
    onRango(f, s && !problemaDeSalida(f, s) ? s : null);
  };

  const alEscribirSalida = (texto: string) => {
    const valor = conBarras(texto);
    setVuelta(valor);
    setErrorSalida(undefined);
    if (valor.length < 10) return;
    const s = leerFecha(valor);
    const desde = leerFecha(llegada);
    if (!desde) {
      setErrorSalida("Escribe primero la llegada");
      return;
    }
    const problema = s ? problemaDeSalida(desde, s) : "Esa fecha no existe";
    if (!s || problema) {
      setErrorSalida(problema);
      return;
    }
    onRango(desde, s);
  };

  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <Input
          label="Llegada"
          value={llegada}
          onChangeText={alEscribirLlegada}
          placeholder="dd/mm/aaaa"
          type="numeric"
          error={errorLlegada}
        />
      </View>
      <View className="flex-1">
        <Input
          label="Salida"
          value={vuelta}
          onChangeText={alEscribirSalida}
          placeholder="dd/mm/aaaa"
          type="numeric"
          error={errorSalida}
        />
      </View>
    </View>
  );
}
