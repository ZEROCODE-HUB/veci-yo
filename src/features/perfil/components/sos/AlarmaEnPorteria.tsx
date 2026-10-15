import React, { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal } from "@/shared/components";
import { supabase } from "@/shared/services/supabase";
import { useUIStore } from "@/stores";
import { formatDateTime, mensajeDeError } from "@/shared/utils";
import { atenderSos, sosActivas, type AlarmaAbierta } from "../../services/sos.repo";
import { sonarAlarma } from "./sonidoDeAlarma";

/**
 * El S.O.S. en la portería, en vivo (14/10/2026).
 *
 * Lo pidió la responsable de producto: «las alertas S.O.S. deben llegar al
 * guardia; la única opción es desactivarla y reportar incidencia». Mientras
 * haya una abierta, la pantalla roja no se va: no tiene botón de cerrar, solo
 * «Desactivar y reportar incidencia», que pide qué pasó y qué vio y deja una
 * PQRS de seguridad.
 *
 * Se entera por Realtime (y vuelve a mirar cada 20 s por si se cae la
 * conexión). Con la app cerrada no suena: no hay avisos push todavía.
 */
export function AlarmaEnPorteria() {
  const cliente = useQueryClient();
  const { addToast } = useUIStore();
  const conocidas = useRef<Set<string>>(new Set());
  const [atendiendo, setAtendiendo] = useState<AlarmaAbierta | null>(null);
  const [quePaso, setQuePaso] = useState("");
  const [queVio, setQueVio] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: alarmas = [] } = useQuery({
    queryKey: ["sos", "activas"],
    queryFn: sosActivas,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const canal = supabase
      .channel("sos-porteria")
      .on("postgres_changes", { event: "*", schema: "public", table: "alarma_sos" }, () => {
        void cliente.invalidateQueries({ queryKey: ["sos", "activas"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [cliente]);

  // Suena cada vez que aparece una que no conocía.
  useEffect(() => {
    const nuevas = alarmas.filter((a) => !conocidas.current.has(a.id));
    if (nuevas.length > 0) sonarAlarma();
    conocidas.current = new Set(alarmas.map((a) => a.id));
  }, [alarmas]);

  if (alarmas.length === 0) return null;
  const alarma = atendiendo ?? alarmas[0];

  const desactivar = async () => {
    if (!quePaso.trim() || !queVio.trim()) {
      setError("Escribe qué pasó y qué viste.");
      return;
    }
    setEnviando(true);
    try {
      await atenderSos(alarma.id, quePaso, queVio);
      addToast("S.O.S. desactivado. Quedó la incidencia en PQRS", "success");
      setAtendiendo(null);
      setQuePaso("");
      setQueVio("");
      setError("");
      await cliente.invalidateQueries({ queryKey: ["sos", "activas"] });
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo desactivar el S.O.S."), "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    // Sin botón de cerrar a propósito: la única salida es atenderlo.
    <Modal visible onClose={() => {}} title="🆘 S.O.S. activado" showClose={false}>
      <View className="gap-3">
        <View className="rounded-xl bg-red-600 p-4 gap-1">
          <Text className="text-base font-bold text-white">
            {alarma.unidad
              ? `Vivienda ${alarma.unidad}${alarma.torre ? ` · Torre ${alarma.torre}` : ""}`
              : "Sin vivienda"}
          </Text>
          <Text className="text-sm text-white">
            {alarma.quien ?? "Un vecino"} · {formatDateTime(new Date(alarma.activadaEn))}
          </Text>
          {alarmas.length > 1 ? (
            <Text className="text-xs text-white">Hay {alarmas.length} alarmas abiertas.</Text>
          ) : null}
        </View>
        {alarma.telefono ? (
          <Button variant="secondary" fullWidth onPress={() => Linking.openURL(`tel:${alarma.telefono}`)}>
            Llamar a quien la activó
          </Button>
        ) : null}
        <Input
          label="Qué pasó"
          value={quePaso}
          onChangeText={(t) => {
            setQuePaso(t);
            setError("");
          }}
          multiline
          showEditIcon={false}
        />
        <Input
          label="Qué viste"
          value={queVio}
          onChangeText={(t) => {
            setQueVio(t);
            setError("");
          }}
          multiline
          showEditIcon={false}
          error={error || undefined}
        />
        <Button variant="danger" fullWidth loading={enviando} onPress={desactivar}>
          Desactivar y reportar incidencia
        </Button>
      </View>
    </Modal>
  );
}
