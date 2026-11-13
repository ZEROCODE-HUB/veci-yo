import React, { useState } from "react";
import { Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eliminarVisita, visitasDeAmigosEn, type VisitaDeAmigos } from "../services/visitas.repo";
import { VISITAS_QUERY_KEY } from "../hooks/useVisitas";
import { mensajeDeError } from "@/shared/utils/error.util";
import { AmigosEnLaEstancia } from "./nuevo/AmigosEnLaEstancia";
import { obtenerSuscripcion } from "@/features/propietario/services/suscripcion.repo";
import { ayudaDeEstacionamientos, topeDeVehiculos } from "../helpers/estacionamientos";
import { Button, CampoFecha, Contador, Modal, Toggle } from "@/shared/components";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import type { VisitaItem } from "@/shared/types";
import { ahora, parseFechaIso } from "@/shared/utils";

/** El día siguiente a `d`, a medianoche. */
const diaSiguiente = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/**
 * Qué días se ofrecen al cambiar las fechas, y qué está mal de lo elegido.
 *
 * El calendario dejaba elegir una salida anterior a la llegada, y al revés
 * (Para Claude, 21/10/2026). Son las mismas reglas que comprueba
 * `cambiar_fechas_de_estancia`: la llegada no en el pasado, y la salida al
 * menos un día después de la llegada y no en el pasado.
 */
export function limitesDeLasFechas(desde: string, hasta: string, hoy: Date) {
  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const llegada = parseFechaIso(desde);
  const salida = parseFechaIso(hasta);
  const salidaMinima = llegada && llegada >= hoy0 ? diaSiguiente(llegada) : hoy0;
  const error =
    llegada && salida && salida <= llegada
      ? "La salida tiene que ser al menos un día después de la llegada."
      : null;
  return { llegadaMinima: hoy0, salidaMinima, error };
}

interface Props {
  visita: VisitaItem;
  onCambiarFechas: (desde: string, hasta: string) => Promise<void>;
  /** Cuántas personas vienen: el contador de siempre, puesto aquí dentro. */
  cuantosVienen?: React.ReactNode;
  /** La cantidad de vehículos y si trae mascota (QA 23/10/2026). */
  onCambiarExtras: (cambios: { vehiculosPrevistos?: number | null; traeMascota?: boolean }) => Promise<void>;
  ocupado?: boolean;
}

const NOMBRE_DE_MASCOTA: Record<string, string> = { perro: "Perro", gato: "Gato", otra: "Otra" };

/** `dd/MM/yyyy` a `yyyy-MM-dd`, que es lo que pide el calendario. */
function aIso(fecha?: string): string {
  if (!fecha) return "";
  const [d, m, a] = fecha.split("/");
  return a && m && d ? `${a}-${m}-${d}` : "";
}

/**
 * Editar la reserva (QA 23/10/2026, responsable de producto): fechas,
 * cuántas personas, cuántos vehículos y si trae mascota. Las personas y los
 * vehículos van solo como **cantidad**: sus datos y sus placas los pone el
 * huésped en su preregistro.
 */
export function EditarEstancia({
  visita,
  onCambiarFechas,
  cuantosVienen,
  onCambiarExtras,
  ocupado = false,
}: Props) {
  const { addToast } = useUIStore();
  const parametros = useParametrosDeLaBase();
  const [fechas, setFechas] = useState<{ desde: string; hasta: string } | null>(null);
  /*
    Al mover la reserva, las visitas de amigos que quedan dentro (10/11/2026):
    se enseñan antes de guardar, como al crearla. Se cierra la ventana de las
    fechas para no abrir una encima de otra, y se guardan aparte.
  */
  const [amigos, setAmigos] = useState<VisitaDeAmigos[] | null>(null);
  const [fechasPendientes, setFechasPendientes] = useState<{ desde: string; hasta: string } | null>(null);
  /*
    Qué se está guardando ahora (13/11/2026). `ocupado` solo cubre las fechas
    y las personas: «Guardar vehículos» y la mascota no decían nada mientras
    se guardaban, y el «Guardar» de las fechas se podía pulsar otra vez
    mientras se comprobaban las visitas de amigos.
  */
  const [enCurso, setEnCurso] = useState<"fechas" | "vehiculos" | "mascota" | null>(null);
  const queryClient = useQueryClient();
  const registrados = visita.vehiculos?.length ?? 0;
  const [vehiculos, setVehiculos] = useState(visita.vehiculosPrevistos ?? registrados);
  // La misma consulta que la nueva reserva: los estacionamientos del
  // alojamiento son el tope de vehículos (hueco 17).
  const { data: suscripcion } = useQuery({
    queryKey: ["suscripcion", visita.unidadId ?? ""],
    queryFn: () => obtenerSuscripcion(visita.unidadId ?? ""),
    enabled: Boolean(visita.unidadId),
  });
  const ayudaDelAlojamiento = ayudaDeEstacionamientos(suscripcion?.estacionamientosHuesped);

  const personas = visita.invitados ?? [];
  const alguienDentro = personas.some((p) => p.llego);
  const terminada = ["Finalizado", "Cancelado"].includes(visita.estado);

  const limites = limitesDeLasFechas(fechas?.desde ?? "", fechas?.hasta ?? "", ahora());

  const guardarFechas = async (f: { desde: string; hasta: string }, mirarAmigos: boolean) => {
    if (enCurso) return;
    setEnCurso("fechas");
    try {
      if (mirarAmigos && visita.unidadId) {
        try {
          const pisadas = await visitasDeAmigosEn(visita.unidadId, f.desde, f.hasta);
          if (pisadas.length) {
            setFechasPendientes(f);
            setFechas(null);
            setAmigos(pisadas);
            return;
          }
        } catch (e) {
          addToast(mensajeDeError(e, "No se pudo comprobar si hay visitas en esas fechas"), "error");
          return;
        }
      }
      await intentar(() => onCambiarFechas(f.desde, f.hasta), "Fechas cambiadas", () => setFechas(null));
    } finally {
      setEnCurso(null);
    }
  };

  const intentar = async (accion: () => Promise<void>, exito: string, cerrar?: () => void) => {
    try {
      await accion();
      addToast(exito, "success");
      cerrar?.();
    } catch {
      // El aviso del fallo lo da el hook, con el motivo de la base.
    }
  };

  /** Lo mismo, marcando qué se guarda para que su control espere. */
  const guardarExtra = async (
    que: "vehiculos" | "mascota",
    accion: () => Promise<void>,
    exito: string,
  ) => {
    if (enCurso) return;
    setEnCurso(que);
    try {
      await intentar(accion, exito);
    } finally {
      setEnCurso(null);
    }
  };

  if (terminada) return null;

  const vehiculosCambiados = vehiculos !== (visita.vehiculosPrevistos ?? registrados);

  return (
    <View className="rounded-2xl bg-white p-4 gap-4 shadow-sm">
      <Text className="text-base font-bold text-gray-900">Editar la reserva</Text>

      <View className="gap-1">
        <Text className="text-sm font-semibold text-gray-900">Fechas</Text>
        <Text className="text-xs text-gray-600">
          {alguienDentro
            ? "Ya entraron: puedes extender o acortar la salida."
            : "Puedes mover la llegada y la salida."}{" "}
          Si la estancia pasa de corta a larga (o al revés), sus permisos en el
          edificio se actualizan automáticamente.
        </Text>
        <View className="flex-row">
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              setFechas({ desde: aIso(visita.fechaDesde), hasta: aIso(visita.fechaHasta) })
            }
          >
            Cambiar fechas
          </Button>
        </View>
      </View>

      {cuantosVienen ? (
        <View className="gap-1">
          <Text className="text-sm font-semibold text-gray-900">Personas</Text>
          {cuantosVienen}
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-sm font-semibold text-gray-900">Vehículos</Text>
        {parametros.listo ? (
          <Contador
            emoji="🚗"
            label="Cuántos vehículos vienen"
            ayuda={[
              registrados > 0
                ? `Tu huésped ya registró ${registrados}: no puede ser menos.`
                : "Las placas las pone tu huésped en su preregistro.",
              ayudaDelAlojamiento,
            ]
              .filter(Boolean)
              .join(" ")}
            valor={vehiculos}
            minimo={registrados}
            // Los que ya están registrados (la portería puede apuntar uno al
            // llegar) no se quitan por esto: el tope nunca baja de ellos.
            maximo={Math.max(
              registrados,
              topeDeVehiculos(
                suscripcion?.estacionamientosHuesped,
                parametros.numero("personas_vehiculos_tope"),
              ),
            )}
            onCambiar={setVehiculos}
          />
        ) : null}
        {vehiculosCambiados ? (
          <View className="flex-row">
            <Button
              size="sm"
              loading={enCurso === "vehiculos"}
              disabled={ocupado || enCurso !== null}
              onPress={() =>
                guardarExtra(
                  "vehiculos",
                  () => onCambiarExtras({ vehiculosPrevistos: vehiculos }),
                  "Vehículos actualizados",
                )
              }
            >
              Guardar vehículos
            </Button>
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="shrink text-sm font-semibold text-gray-900">¿Trae mascota?</Text>
          <Toggle
            value={Boolean(visita.traeMascota)}
            cargando={enCurso === "mascota"}
            disabled={enCurso !== null && enCurso !== "mascota"}
            onChange={(valor) =>
              void guardarExtra(
                "mascota",
                () => onCambiarExtras({ traeMascota: valor }),
                valor ? "Se le pedirá registrar su mascota" : "Sin mascota",
              )
            }
            labelRight={visita.traeMascota ? "Sí" : "No"}
          />
        </View>
        {(visita.mascotas?.length ?? 0) > 0 ? (
          <Text className="text-xs text-gray-600">
            Registró:{" "}
            {visita.mascotas!.map((m) => `${m.nombre} (${NOMBRE_DE_MASCOTA[m.tipo] ?? m.tipo})`).join(", ")}
          </Text>
        ) : visita.traeMascota ? (
          <Text className="text-xs text-gray-600">
            Tu huésped la registra en su preregistro.
          </Text>
        ) : null}
      </View>

      <Modal visible={!!fechas} onClose={() => setFechas(null)} title="Cambiar fechas">
        <View className="gap-4">
          {!alguienDentro ? (
            <CampoFecha
              label="Llegada"
              value={fechas?.desde ?? ""}
              minima={limites.llegadaMinima}
              onChange={(v) => setFechas((f) => (f ? { ...f, desde: v } : f))}
            />
          ) : null}
          <CampoFecha
            label="Salida"
            value={fechas?.hasta ?? ""}
            minima={limites.salidaMinima}
            error={limites.error ?? undefined}
            onChange={(v) => setFechas((f) => (f ? { ...f, hasta: v } : f))}
          />
          <Button
            fullWidth
            loading={ocupado || enCurso === "fechas"}
            disabled={Boolean(limites.error)}
            onPress={() => {
              if (fechas) void guardarFechas(fechas, true);
            }}
          >
            Guardar
          </Button>
        </View>
      </Modal>
      <AmigosEnLaEstancia
        visitas={amigos}
        onCancelarVisita={async (visitaId) => {
          try {
            await eliminarVisita(visitaId);
            void queryClient.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
            const quedan = (amigos ?? []).filter((a) => a.visitaId !== visitaId);
            setAmigos(quedan.length ? quedan : null);
            // Sin ninguna, se vuelve a las fechas para guardarlas.
            if (!quedan.length) {
              setFechas(fechasPendientes);
              setFechasPendientes(null);
            }
            addToast("Visita cancelada", "success");
          } catch (e) {
            addToast(mensajeDeError(e, "No se pudo cancelar la visita"), "error");
          }
        }}
        onGuardarIgual={() => {
          const f = fechasPendientes;
          setAmigos(null);
          setFechasPendientes(null);
          if (f) void guardarFechas(f, false);
        }}
        onCerrar={() => {
          setAmigos(null);
          setFechas(fechasPendientes);
          setFechasPendientes(null);
        }}
      />
    </View>
  );
}
