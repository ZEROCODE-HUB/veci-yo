import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "@/shared/components";
import { supabase } from "@/shared/services/supabase";
import { useAuthStore, useUIStore } from "@/stores";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils";
import { sonarAlarma } from "@/features/perfil/components/sos/sonidoDeAlarma";
import { anotarEnLaBase, describirError } from "@/shared/services/erroresDeLaApp";
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
import { terminarLlamadaNativa } from "../services/llamadasNativas";
import { useLlamadaDesdeFuera } from "../hooks/useLlamadaDesdeFuera";
import { LlamadaEnCurso } from "./LlamadaEnCurso";

/** Quién llama, para la llamada entrante. */
function deQuien(l: LlamadaInternet): string {
  const origen = l.origen ?? (l.deUnidad ? "vivienda" : "porteria");
  const lugar =
    origen === "administracion"
      ? "Administración"
      : origen === "porteria"
        ? "Portería"
        : `Vivienda ${l.deUnidad ?? ""}`.trim();
  // Con el nombre completo delante, si se sabe (29/10/2026).
  return l.deNombre ? `${l.deNombre} · ${lugar}` : lugar;
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
 * colgar. La voz va por LiveKit.
 *
 * Con la app cerrada, desde el 28/10/2026 la base manda un push
 * (`avisar-llamada`): en Android con el APK nuevo es una llamada de verdad
 * sobre el bloqueo, y en iPhone un aviso (o CallKit, cuando haya cuenta de
 * Apple). «Contestar» ahí llega aquí por `useLlamadaDesdeFuera`.
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
    // La que dejó de sonar --la contestó otro, colgaron-- se quita también de
    // la pantalla de llamada del iPhone (CallKit), si estaba ahí.
    for (const id of yaSono.current) {
      if (id !== llamadaId && !entrantes.some((l) => l.id === id)) terminarLlamadaNativa(id);
    }
  }, [entrantes, llamadaId]);

  // La llamada abierta: su estado, mirado cada pocos segundos y por Realtime.
  const { data: abierta } = useQuery({
    queryKey: ["intercom", "abierta", llamadaId],
    queryFn: () => obtenerLlamada(llamadaId ?? ""),
    enabled: Boolean(llamadaId),
    refetchInterval: 3_000,
  });

  const cerrar = async (aviso?: string) => {
    if (llamadaId) terminarLlamadaNativa(llamadaId);
    await conexion.current?.colgar().catch(() => {});
    conexion.current = null;
    setEstado(null);
    setSegundos(0);
    setSilencio(false);
    terminar();
    if (aviso) addToast(aviso, "info");
  };

  /*
    Contestar o colgar desde fuera de la app: la pantalla de llamada de
    Android o CallKit en iPhone. Lo mismo que los botones de aquí abajo.
  */
  /*
    Al abrir la app desde «Contestar» (29/10/2026): la app tardaba en mostrar
    la llamada y había que volver a pulsar «Contestar». Recién abierta, la
    sesión o la lectura de la llamada pueden no estar listas todavía, y un
    primer intento fallido se tomaba por «ya no suena». Ahora se reintenta unos
    segundos, se recuerda qué llamada había que contestar --si aparece en la
    lista de las que suenan, se contesta sola-- y cada paso deja un rastro en
    `error_de_la_app` para poder ver en qué se quedó.
  */
  const porContestar = useRef<string | null>(null);
  const contestarPorId = async (id: string) => {
    if (llamadaId === id) return;
    porContestar.current = id;
    void anotarEnLaBase("rastro", "contestar desde fuera", `pedido ${id}`);
    try {
      let l: LlamadaInternet | null = null;
      for (let intento = 0; intento < 6; intento++) {
        l = await obtenerLlamada(id).catch(() => null);
        if (l) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!l) {
        void anotarEnLaBase("rastro", "contestar desde fuera", `sin leer la llamada ${id}`);
        return;
      }
      if (l.estado !== "sonando") {
        porContestar.current = null;
        terminarLlamadaNativa(id);
        addToast("Esa llamada ya no está sonando", "info");
        void anotarEnLaBase("rastro", "contestar desde fuera", `ya no suena: ${l.estado}`);
        return;
      }
      await contestarLlamada(id);
      porContestar.current = null;
      iniciar(id, false, deQuien(l));
      void anotarEnLaBase("rastro", "contestar desde fuera", `contestada ${id}`);
    } catch (e) {
      porContestar.current = null;
      terminarLlamadaNativa(id);
      addToast(mensajeDeError(e, "No se pudo contestar"), "error");
      const { mensaje, detalle } = describirError(e);
      void anotarEnLaBase("error", "contestar desde fuera", mensaje, detalle);
    }
  };
  // Si la que había que contestar aparece entre las que suenan, se contesta sola.
  useEffect(() => {
    const id = porContestar.current;
    if (id && !llamadaId && entrantes.some((l) => l.id === id)) void contestarPorId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrantes, llamadaId]);
  const colgarPorId = async (id: string) => {
    if (llamadaId === id) {
      await colgarLlamada(id).catch(() => {});
      void cerrar();
      return;
    }
    await rechazarLlamada(id).catch(() => {});
    void cliente.invalidateQueries({ queryKey: ["intercom"] });
  };
  useLlamadaDesdeFuera(usuarioId, {
    contestar: (id) => void contestarPorId(id),
    colgar: (id) => void colgarPorId(id),
    ver: () => void cliente.invalidateQueries({ queryKey: ["intercom"] }),
  });

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
