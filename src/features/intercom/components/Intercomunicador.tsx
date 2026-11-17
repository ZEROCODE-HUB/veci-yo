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
  contestarYaNoSePuede,
  llamadasQueMeSuenan,
  obtenerLlamada,
  olvidarPermisoDeVoz,
  permisoDeVoz,
  rechazarLlamada,
  type LlamadaInternet,
} from "../services/intercom.repo";
import {
  conectarVoz,
  precalentarVoz,
  prepararMicrofono,
  type Conexion,
} from "../services/vozDeLlamada";
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

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  /*
    Altavoz (17/11/2026, pedido del cliente). Con qué empieza lo dice el
    parámetro `llamada_empieza_en_altavoz`; se guarda en una referencia porque
    la voz se conecta en un efecto que solo mira la llamada.
  */
  const [altavoz, setAltavoz] = useState(true);
  const altavozAlEmpezar = useRef(true);
  if (parametros.listo) {
    try {
      altavozAlEmpezar.current = parametros.booleano("llamada_empieza_en_altavoz");
    } catch {
      // Sin el parámetro, por el altavoz: lo de siempre.
    }
  }
  const [contestando, setContestando] = useState(false);
  /*
    Rechazar no decía nada mientras se guardaba, se podía pulsar a la vez que
    Contestar, y si fallaba se callaba (13/11/2026).
  */
  const [rechazando, setRechazando] = useState(false);
  const yaSono = useRef<Set<string>>(new Set());

  const { data: entrantes = [] } = useQuery({
    queryKey: ["intercom", "entrantes", usuarioId],
    queryFn: () => llamadasQueMeSuenan(usuarioId ?? ""),
    enabled: Boolean(usuarioId),
    refetchInterval: 15_000,
  });

  // iPhone: el micrófono se pide con la app abierta; bloqueado no se puede.
  useEffect(() => {
    if (usuarioId) void prepararMicrofono();
  }, [usuarioId]);

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
  const yaAvisada = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const l of entrantes) {
      if (!yaSono.current.has(l.id)) {
        yaSono.current.add(l.id);
        sonarAlarma();
        /*
          Mientras suena se pide ya el permiso de la sala de voz y se calienta
          la conexión (17/11/2026): al contestar no se empieza de cero, que es
          lo que hacía tardar en oírse.
        */
        void permisoDeVoz(l.id)
          .then(({ servidor, token }) => precalentarVoz(servidor, token))
          .catch(() => {});
      }
    }
    // La que dejó de sonar --la contestó otro, colgaron-- se quita también de
    // la pantalla de llamada del iPhone (CallKit), si estaba ahí.
    for (const id of yaSono.current) {
      if (id === llamadaId || entrantes.some((l) => l.id === id)) continue;
      terminarLlamadaNativa(id);
      /*
        Con «Todos» contesta el primero (17/11/2026): a los demás se les dice
        que ya contestó otra persona, en vez de desaparecer sin más.
      */
      if (yaAvisada.current.has(id)) continue;
      yaAvisada.current.add(id);
      olvidarPermisoDeVoz(id);
      void obtenerLlamada(id)
        .then((l) => {
          if (l?.estado === "en_curso" && l.contestadaPor && l.contestadaPor !== usuarioId) {
            addToast("Ya contestó otra persona", "info");
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrantes, llamadaId]);

  // La llamada abierta: su estado, mirado cada pocos segundos y por Realtime.
  const { data: abierta } = useQuery({
    queryKey: ["intercom", "abierta", llamadaId],
    queryFn: () => obtenerLlamada(llamadaId ?? ""),
    enabled: Boolean(llamadaId),
    refetchInterval: 3_000,
  });

  const cerrar = async (aviso?: string) => {
    if (llamadaId) {
      terminarLlamadaNativa(llamadaId);
      olvidarPermisoDeVoz(llamadaId);
    }
    await conexion.current?.colgar().catch(() => {});
    conexion.current = null;
    setEstado(null);
    setSegundos(0);
    setSilencio(false);
    setAltavoz(true);
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
  /*
    17/11/2026: se contestaba dos veces a la vez --el enlace y la lista de las
    que suenan llegaban casi juntos-- y la segunda decía «ya no está sonando» y
    quitaba la llamada de la pantalla del sistema (rastros del 17/11, 17:01).
    Ahora una sola a la vez (`contestandoYa`). Y ya no se lee la llamada antes
    de contestar: se contesta en seguida (reintentando si la sesión no está
    lista) y a la vez se lee quién llama y se pide el permiso de la voz.
  */
  const porContestar = useRef<string | null>(null);
  const contestandoYa = useRef<string | null>(null);
  const contestarPorId = async (id: string) => {
    if (llamadaId === id || contestandoYa.current === id) return;
    contestandoYa.current = id;
    porContestar.current = id;
    void anotarEnLaBase("rastro", "contestar desde fuera", `pedido ${id}`);
    try {
      void permisoDeVoz(id).catch(() => {});
      const quien = (async () => {
        for (let intento = 0; intento < 6; intento++) {
          const l = await obtenerLlamada(id).catch(() => null);
          if (l) return l;
          await esperar(1000);
        }
        return null;
      })();
      let contestada = false;
      for (let intento = 0; intento < 6 && !contestada; intento++) {
        try {
          await contestarLlamada(id);
          contestada = true;
        } catch (e) {
          if (contestarYaNoSePuede(e)) throw e;
          await esperar(1000);
        }
      }
      if (!contestada) {
        // Se queda en `porContestar`: si aparece entre las que suenan, se contesta sola.
        void anotarEnLaBase("rastro", "contestar desde fuera", `sin poder contestar ${id}`);
        return;
      }
      const l = await quien;
      porContestar.current = null;
      iniciar(id, false, l ? deQuien(l) : "Llamada");
      void anotarEnLaBase("rastro", "contestar desde fuera", `contestada ${id}`);
    } catch (e) {
      porContestar.current = null;
      terminarLlamadaNativa(id);
      const yaNo = contestarYaNoSePuede(e);
      addToast(yaNo ?? mensajeDeError(e, "No se pudo contestar"), yaNo ? "info" : "error");
      const { mensaje, detalle } = describirError(e);
      void anotarEnLaBase(yaNo ? "rastro" : "error", "contestar desde fuera", mensaje, detalle);
    } finally {
      contestandoYa.current = null;
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
        const empiezaEnAltavoz = altavozAlEmpezar.current;
        const c = await conectarVoz(
          servidor,
          token,
          () => {
            void anotarEnLaBase("rastro", "voz de la llamada", `se cortó ${llamadaId}`);
            void cerrar("Se cortó la llamada");
          },
          { altavoz: empiezaEnAltavoz },
        );
        if (!vigente) {
          await c.colgar();
          return;
        }
        conexion.current = c;
        setAltavoz(empiezaEnAltavoz);
      } catch (e) {
        // Antes no quedaba rastro: en iPhone la llamada se colgaba sola y no
        // había forma de saber por qué (09/11/2026).
        const { mensaje, detalle } = describirError(e);
        void anotarEnLaBase("error", "voz de la llamada", `no conectó ${llamadaId}: ${mensaje}`, detalle);
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
          altavoz={altavoz}
          onAltavoz={async () => {
            if (!conexion.current) return;
            try {
              await conexion.current.altavoz(!altavoz);
              setAltavoz(!altavoz);
            } catch (e) {
              addToast(mensajeDeError(e, "No se pudo cambiar la salida del audio"), "error");
            }
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
              loading={rechazando}
              disabled={contestando}
              onPress={async () => {
                setRechazando(true);
                try {
                  await rechazarLlamada(entrante.id);
                } catch (e) {
                  addToast(mensajeDeError(e, "No se pudo rechazar la llamada"), "error");
                } finally {
                  setRechazando(false);
                  void cliente.invalidateQueries({ queryKey: ["intercom"] });
                }
              }}
            >
              Rechazar
            </Button>
          </View>
          <View className="flex-1">
            <Button
              fullWidth
              loading={contestando}
              disabled={rechazando}
              onPress={async () => {
                setContestando(true);
                try {
                  // El permiso de la voz, a la vez (casi siempre ya está pedido).
                  void permisoDeVoz(entrante.id).catch(() => {});
                  await contestarLlamada(entrante.id);
                  iniciar(entrante.id, false, deQuien(entrante));
                } catch (e) {
                  const yaNo = contestarYaNoSePuede(e);
                  addToast(yaNo ?? mensajeDeError(e, "No se pudo contestar"), yaNo ? "info" : "error");
                  void cliente.invalidateQueries({ queryKey: ["intercom"] });
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
