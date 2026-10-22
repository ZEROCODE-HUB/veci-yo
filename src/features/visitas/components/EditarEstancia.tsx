import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, CampoFecha, Input, Modal, Select } from "@/shared/components";
import { useUIStore } from "@/stores";
import type { VisitaItem } from "@/shared/types";
import { parseFechaIso } from "@/shared/utils";

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
  onQuitarPersona: (invitadoUuid: string) => Promise<void>;
  onAgregarVehiculo: (placa: string, tipo: string, responsableUuid: string) => Promise<void>;
  ocupado?: boolean;
}

/** `dd/MM/yyyy` a `yyyy-MM-dd`, que es lo que pide el calendario. */
function aIso(fecha?: string): string {
  if (!fecha) return "";
  const [d, m, a] = fecha.split("/");
  return a && m && d ? `${a}-${m}-${d}` : "";
}

// Los del enum `tipo_vehiculo` de la base.
const TIPOS_VEHICULO = [
  { label: "Carro", value: "auto" },
  { label: "Camioneta", value: "camioneta" },
  { label: "Moto", value: "moto" },
  { label: "Van", value: "van" },
  { label: "Bus", value: "bus" },
];

/**
 * Lo que el anfitrión puede cambiar de una estancia, y lo que no (14/10/2026).
 *
 * Lo pidió la responsable de producto: «editar los tiempos de reserva; mostrar
 * qué puede hacer el huésped y el anfitrión: agregar y quitar personas,
 * extender fechas, agregar vehículos». Cada acción dice por qué no se puede
 * cuando no se puede, en vez de esconderse. Las reglas viven en la base.
 */
export function EditarEstancia({
  visita,
  onCambiarFechas,
  onQuitarPersona,
  onAgregarVehiculo,
  ocupado = false,
}: Props) {
  const { addToast } = useUIStore();
  const [fechas, setFechas] = useState<{ desde: string; hasta: string } | null>(null);
  const [vehiculo, setVehiculo] = useState<{ placa: string; tipo: string; responsable: string } | null>(null);
  const [quitando, setQuitando] = useState<{ uuid: string; nombre: string } | null>(null);

  const personas = visita.invitados ?? [];
  const alguienDentro = personas.some((p) => p.llego);
  const terminada = ["Finalizado", "Cancelado"].includes(visita.estado);
  const cerrado = Boolean(personas[0]?.timeline?.precheckinCerrado);
  const quitables = personas.slice(1).filter((p) => !p.llego && p.uuid);
  const adultos = personas.filter((p) => !p.esMenor && p.uuid);

  const limites = limitesDeLasFechas(fechas?.desde ?? "", fechas?.hasta ?? "", new Date());

  const intentar = async (accion: () => Promise<void>, exito: string, cerrar: () => void) => {
    try {
      await accion();
      addToast(exito, "success");
      cerrar();
    } catch {
      // El aviso del fallo lo da el hook, con el motivo de la base.
    }
  };

  if (terminada) return null;

  return (
    <View className="rounded-2xl bg-white p-4 gap-3 shadow-sm">
      <Text className="text-base font-bold text-gray-900">Qué puedes cambiar</Text>

      <View className="gap-1">
        <Text className="text-sm font-semibold text-gray-900">Fechas</Text>
        <Text className="text-xs text-gray-600">
          {alguienDentro
            ? "Ya entraron: puedes extender o acortar la salida."
            : "Puedes mover la llegada y la salida."}{" "}
          Si la estancia pasa de corta a larga (o al revés), sus permisos en el
          edificio cambian solos.
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

      <View className="gap-1">
        <Text className="text-sm font-semibold text-gray-900">Personas</Text>
        <Text className="text-xs text-gray-600">
          {cerrado
            ? "El preregistro ya está cerrado: para que venga alguien más, crea otra estancia o pide al huésped que lo registre en la portería."
            : "Cambia cuántas vienen más abajo; el huésped las registra desde su enlace."}{" "}
          Puedes quitar a quien todavía no ha entrado.
        </Text>
        {quitables.map((p) => (
          <View key={p.uuid} className="flex-row items-center justify-between gap-2">
            <Text className="text-xs text-gray-900 flex-1">{p.nombre}</Text>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setQuitando({ uuid: p.uuid ?? "", nombre: p.nombre })}
            >
              Quitar
            </Button>
          </View>
        ))}
      </View>

      <View className="gap-1">
        <Text className="text-sm font-semibold text-gray-900">Vehículos</Text>
        <Text className="text-xs text-gray-600">
          Puedes agregar una placa en cualquier momento antes de la salida.
        </Text>
        <View className="flex-row">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setVehiculo({ placa: "", tipo: "auto", responsable: adultos[0]?.uuid ?? "" })}
          >
            Agregar vehículo
          </Button>
        </View>
      </View>

      <Text className="text-2xs text-gray-500">
        El huésped, desde su enlace y mientras el preregistro esté abierto,
        completa sus datos, agrega a sus acompañantes —hasta el número de la
        reserva o, si no lo fijaste, hasta el aforo del alojamiento— y apunta
        sus vehículos.
      </Text>

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
            loading={ocupado}
            disabled={Boolean(limites.error)}
            onPress={() =>
              fechas &&
              intentar(
                () => onCambiarFechas(fechas.desde, fechas.hasta),
                "Fechas cambiadas",
                () => setFechas(null),
              )
            }
          >
            Guardar
          </Button>
        </View>
      </Modal>

      <Modal visible={!!vehiculo} onClose={() => setVehiculo(null)} title="Agregar vehículo">
        <View className="gap-4">
          <Input
            label="Placa"
            value={vehiculo?.placa ?? ""}
            onChangeText={(t) => setVehiculo((v) => (v ? { ...v, placa: t } : v))}
            placeholder="ABC123"
            showEditIcon={false}
          />
          <Select
            label="Tipo"
            value={vehiculo?.tipo ?? null}
            options={TIPOS_VEHICULO}
            onChange={(t) => setVehiculo((v) => (v ? { ...v, tipo: String(t) } : v))}
          />
          {adultos.length > 0 ? (
            <Select
              label="Quién responde por él"
              value={vehiculo?.responsable || null}
              options={adultos.map((a) => ({ label: a.nombre, value: a.uuid ?? "" }))}
              onChange={(r) => setVehiculo((v) => (v ? { ...v, responsable: String(r) } : v))}
            />
          ) : null}
          <Button
            fullWidth
            loading={ocupado}
            disabled={!vehiculo?.placa.trim()}
            onPress={() =>
              vehiculo &&
              intentar(
                () => onAgregarVehiculo(vehiculo.placa, vehiculo.tipo, vehiculo.responsable),
                "Vehículo agregado",
                () => setVehiculo(null),
              )
            }
          >
            Agregar
          </Button>
        </View>
      </Modal>

      <Modal visible={!!quitando} onClose={() => setQuitando(null)} title="Quitar de la estancia">
        <View className="gap-4">
          <Text className="text-sm leading-5 text-gray-700">
            {quitando?.nombre} deja de estar en la reserva y la reserva pasa a
            ser de una persona menos.
          </Text>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={() => setQuitando(null)}>
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                fullWidth
                loading={ocupado}
                onPress={() =>
                  quitando &&
                  intentar(
                    () => onQuitarPersona(quitando.uuid),
                    "Persona quitada",
                    () => setQuitando(null),
                  )
                }
              >
                Quitar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
