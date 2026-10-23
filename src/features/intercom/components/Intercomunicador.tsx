import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "@/shared/components";
import { supabase } from "@/shared/services/supabase";
import { useAuthStore, useUIStore } from "@/stores";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils";
import { sonarAlarma } from "@/features/perfil/components/sos/sonidoDeAlarma";
import { useIntercomStore } from "../intercom-store";
import {
  colgarLlamada,
  contestarLlamada,
  llamadasQueMeSuenan,
  obtenerLlamada,
  permisoDeVoz,
  rechazarLlamada,
  type LlamadaInternet,
} from "../services/intercom.repo";
import { conectarVoz, type Conexion } from "../services/vozDeLlamada";
import { LlamadaEnCurso } from "./LlamadaEnCurso";

function deQuien(l: LlamadaInternet): string {
  return l.destino === "porteria"
    ? `Vivienda ${l.deUnidad ?? ""}`.trim()
    : "Portería";
}

function reloj(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * El intercomunicador (14/10/2026): la llamada entrante y la llamada en curso.
 *
 * Montado una vez en toda la app. Suena cuando llega una llamada (Realtime),
 * deja contestar o rechazar, y mientras dura enseña el tiempo, silenciar y
 * colgar. La voz va por LiveKit. Con la app cerrada no suena: no hay avisos
 * push todavía.
 */
export function Intercomunicador() {
  const usuarioId = useAuthStore((s) => s.usuarioId);
  const { addToast } = useUIStore();
  const cliente = useQueryClient();
  const parametros = useParametrosDeLaBase();
  const { llamadaId, soyQuienLlama, etiqueta, iniciar, terminar } = useIntercomStore();
  const conexion = useRef<Conexion | null>(null);
  const [estado, setEstado] = useState<LlamadaInternet["estado"] | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [silencio, setSilencio] = useState(false);
  const [contestando, setContestando] = useState(false);
  const yaSono = useRef<Set<string>>(new Set());

  const { data: entrantes = [] } = useQuery({
    queryKey: ["intercom", "entrantes", usuarioId],
    queryFn: () => llamadasQueMeSuenan(usuarioId ?? ""),
    enabled: Boolean(usuarioId),
    refetchInterval: 15_000,
  });

  // Realtime: cualquier cambio en mis llamadas.
  useEffect(() => {
    if (!usuarioId) return;
    const canal = supabase
      .channel("intercom")
      .on("postgres_changes", { event: "*", schema: "public", table: "llamada_internet" }, () => {
        void cliente.invalidateQueries({ queryKey: ["intercom"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [usuarioId, cliente]);

  // Suena cada llamada nueva que entra.
  useEffect(() => {
    for (const l of entrantes) {
      if (!yaSono.current.has(l.id)) {
        yaSono.current.add(l.id);
        sonarAlarma();
      }
    }
  }, [entrantes]);

  // La llamada abierta: su estado, mirado cada pocos segundos y por Realtime.
  const { data: abierta } = useQuery({
    queryKey: ["intercom", "abierta", llamadaId],
    queryFn: () => obtenerLlamada(llamadaId ?? ""),
    enabled: Boolean(llamadaId),
    refetchInterval: 3_000,
  });

  const cerrar = async (aviso?: string) => {
    await conexion.current?.colgar().catch(() => {});
    conexion.current = null;
    setEstado(null);
    setSegundos(0);
    setSilencio(false);
    terminar();
    if (aviso) addToast(aviso, "info");
  };

  // Al abrir una llamada, se conecta la voz.
  useEffect(() => {
    if (!llamadaId) return;
    let vigente = true;
    (async () => {
      try {
        const { servidor, token } = await permisoDeVoz(llamadaId);
        const c = await conectarVoz(servidor, token, () => void cerrar("Se cortó la llamada"));
        if (!vigente) {
          await c.colgar();
          return;
        }
        conexion.current = c;
      } catch (e) {
        addToast(mensajeDeError(e, "No se pudo conectar la llamada"), "error");
        await colgarLlamada(llamadaId).catch(() => {});
        void cerrar();
      }
    })();
    return () => {
      vigente = false;
    };
    // Solo al cambiar de llamada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llamadaId]);

  // Lo que pasa con la llamada abierta.
  useEffect(() => {
    if (!abierta) return;
    setEstado(abierta.estado);
    if (abierta.estado === "rechazada") void cerrar("No contestaron: la llamada fue rechazada");
    if (abierta.estado === "perdida") void cerrar("No contestaron");
    if (abierta.estado === "terminada") void cerrar("Llamada terminada");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta?.estado]);

  /*
    Quien llama no espera para siempre: lo que espera antes de darla por no
    contestada es el parámetro `llamada_segundos_sin_contestar`. Sin los
    parámetros todavía no se arma el reloj; se arma en cuanto llegan.
  */
  const esperaMaximaMs = parametros.listo
    ? parametros.numero("llamada_segundos_sin_contestar") * 1000
    : null;
  useEffect(() => {
    if (!llamadaId || !soyQuienLlama || estado !== "sonando") return;
    if (esperaMaximaMs === null) return;
    const t = setTimeout(() => {
      void colgarLlamada(llamadaId).catch(() => {});
    }, esperaMaximaMs);
    return () => clearTimeout(t);
  }, [llamadaId, soyQuienLlama, estado, esperaMaximaMs]);

  // El reloj de la llamada en curso.
  useEffect(() => {
    if (estado !== "en_curso") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  if (llamadaId) {
    return (
      <Modal visible onClose={() => {}} title="Llamada" showClose={false}>
        <LlamadaEnCurso
          etiqueta={etiqueta}
          situacion={
            estado === "en_curso"
              ? "En llamada"
              : soyQuienLlama
                ? "Llamando…"
                : "Conectando…"
          }
          tiempo={estado === "en_curso" ? reloj(segundos) : undefined}
          silencio={silencio}
          onSilenciar={async () => {
            await conexion.current?.silenciar(!silencio);
            setSilencio(!silencio);
          }}
          onColgar={async () => {
            await colgarLlamada(llamadaId).catch(() => {});
            void cerrar();
          }}
        />
      </Modal>
    );
  }

  const entrante = entrantes[0];
  if (!entrante) return null;

  return (
    <Modal
      visible
      onClose={() => void rechazarLlamada(entrante.id).catch(() => {})}
      title="📞 Llamada entrante"
    >
      <View className="gap-4 items-center">
        <Text className="text-lg font-bold text-gray-900">{deQuien(entrante)} te llama</Text>
        <View className="flex-row gap-2.5 w-full">
          <View className="flex-1">
            <Button
              variant="danger"
              fullWidth
              onPress={async () => {
                await rechazarLlamada(entrante.id).catch(() => {});
                void cliente.invalidateQueries({ queryKey: ["intercom"] });
              }}
            >
              Rechazar
            </Button>
          </View>
          <View className="flex-1">
            <Button
              fullWidth
              loading={contestando}
              onPress={async () => {
                setContestando(true);
                try {
                  await contestarLlamada(entrante.id);
                  iniciar(entrante.id, false, deQuien(entrante));
                } catch (e) {
                  addToast(mensajeDeError(e, "No se pudo contestar"), "error");
                } finally {
                  setContestando(false);
                }
              }}
            >
              Contestar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
