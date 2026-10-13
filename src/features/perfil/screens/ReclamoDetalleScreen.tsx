import { theme } from "@/config";
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { Select, Input, Button, Modal } from "@/shared/components";
import type { PerfilStackParamList } from "@/shared/types";
import { useReclamos } from "../hooks/useReclamos";
import { AdjuntosReclamo } from "../components/reclamos";

type RouteProps = RouteProp<PerfilStackParamList, "ReclamoDetalle">;

const ESTADOS_ADMIN = ["Pendiente", "En curso", "Resuelto"];

export function ReclamoDetalleScreen() {
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const { rolActivo } = useAuthStore();
  const { reclamos, cambiarEstado, resolver } = useReclamos();
  const addToast = useUIStore((estado) => estado.addToast);

  const reclamo = reclamos.find((r) => String(r.id) === id);
  const esAdmin = rolActivo === "administrador";

  const [resolucionOpen, setResolucionOpen] = useState(false);
  const [mensajeResolucion, setMensajeResolucion] = useState("");

  /*
    Pendiente → En curso en cuanto la administración lo abre.

    Las dependencias son el id y el estado, no el reclamo entero: el objeto es
    nuevo en cada refetch y el efecto **escribe**, asi que depender de el
    dispararia la mutacion una y otra vez. Y de la mutacion se toma `mutate`,
    que react-query garantiza estable; `resolver` cambia en cada render.
  */
  const reclamoId = reclamo?.id;
  const reclamoEstado = reclamo?.estado;
  const marcarEnCurso = cambiarEstado.mutate;

  /*
    Solo cambia el estado. Escribía además «Su PQRS está siendo revisado»
    **en la resolución**, que la pantalla pinta bajo el título «Resolución:»
    en verde: una PQRS recién abierta parecía resuelta.
  */
  useEffect(() => {
    if (esAdmin && reclamoId && reclamoEstado === "Pendiente") {
      marcarEnCurso({ id: reclamoId, estado: "En curso" });
    }
  }, [esAdmin, reclamoId, reclamoEstado, marcarEnCurso]);

  if (!reclamo) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-base text-gray-500">No se encontró la PQRS.</Text>
      </View>
    );
  }

  const handleEstadoChange = (estado: string) => {
    if (!estado) return;
    if (reclamo.estado === "Resuelto") return;
    if (estado === "Resuelto") {
      setResolucionOpen(true);
      return;
    }
    cambiarEstado.mutate(
      { id: reclamo.id, estado },
      {
        onError: (fallo) =>
          addToast(
            mensajeDeError(fallo, "No se pudo cambiar el estado"),
            "error",
          ),
      },
    );
  };

  /*
    La ventana se cierra **cuando se guardó**. Se cerraba y vaciaba el mensaje
    antes de saber nada: si fallaba, lo escrito se había perdido.
  */
  const handleResolver = () => {
    if (!mensajeResolucion.trim() || resolver.isPending) return;
    resolver
      .mutateAsync({
        id: reclamo.id,
        estado: "Resuelto",
        mensaje: mensajeResolucion.trim(),
      })
      .then(() => {
        setResolucionOpen(false);
        setMensajeResolucion("");
        addToast("PQRS resuelta", "success");
      })
      .catch((fallo) =>
        addToast(mensajeDeError(fallo, "No se pudo resolver la PQRS"), "error"),
      );
  };

  const estadoColor = reclamo.estado === "Resuelto" ? theme.colors.successLight : theme.colors.warningSoft;
  const estadoTextColor = reclamo.estado === "Resuelto" ? theme.colors.success : theme.colors.iconAmberDark;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {/* Card principal */}
      <View
        className="rounded-2xl p-4"
        style={{
          backgroundColor: theme.colors.bgCard,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/*
          El numero y la categoria. El modal de exito dice «N°: 0722» y le pide
          a la persona que siga su estado por ahi, y luego el detalle no lo
          enseñaba en ningun sitio: ponia «PQRS» a secas. Tampoco decia de que
          area era, que es lo que determina quien lo atiende.
        */}
        <Text className="text-sm text-gray-500 mb-1">PQRS #{reclamo.numero}</Text>
        <Text className="text-sm text-gray-500 mb-2.5">
          {[reclamo.area, reclamo.tipo].filter(Boolean).join(" · ")}
        </Text>

        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Título
        </Text>
        <Text className="text-base text-gray-900 mb-4">{reclamo.titulo}</Text>

        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Descripción:
        </Text>
        <Text className="text-base text-gray-900">{reclamo.descripcion}</Text>

        {reclamo.resolucionAdmin && (
          <>
            <Text className="text-sm font-bold text-gray-900 underline mt-4 mb-1.5">
              {reclamo.estado === "Resuelto"
                ? "Resolución:"
                : "Respuesta de la administración:"}
            </Text>
            <View
              className="p-3 rounded-lg"
              style={{ backgroundColor: theme.colors.successSoft }}
            >
              <Text className="text-base text-gray-900">
                {reclamo.resolucionAdmin}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Estado */}
      <View className="gap-2 items-center">
        {esAdmin ? (
          <Select
            label="Estado de la PQRS"
            value={reclamo.estado}
            /*
              Sin «Pendiente»: abrirla ya la pasa a «En curso», así que
              elegirlo la devolvía sola al instante.
            */
            options={ESTADOS_ADMIN.filter((e) => e !== "Pendiente")}
            onChange={(estado) => handleEstadoChange(String(estado))}
            placeholder="Seleccionar estado"
          />
        ) : (
          <View className="items-center gap-2">
            <Text className="text-sm font-bold text-gray-900 underline">
              ESTADO
            </Text>
            <View
              className="px-6 py-2 rounded-full"
              style={{ backgroundColor: estadoColor }}
            >
              <Text
                className="font-semibold text-sm"
                style={{ color: estadoTextColor }}
              >
                {reclamo.estado}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View
        className="rounded-2xl p-4"
        style={{
          backgroundColor: theme.colors.bgCard,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <AdjuntosReclamo reclamoId={reclamo.id} puedeEditar={!esAdmin} />
      </View>

      {/*
        Dos fechas sueltas, una en cada esquina y sin nada que dijera cual era
        cual. Y la de revision solo existe cuando el PQRS se resolvio, asi que
        lo normal era ver una sola fecha perdida y sin explicar.
      */}
      <View className="flex-row justify-between px-2">
        <Text className="text-sm text-gray-500">
          Enviado el {reclamo.fechaCreacion}
        </Text>
        {Boolean(reclamo.fechaRevision) && (
          <Text className="text-sm text-gray-500">
            Resuelto el {reclamo.fechaRevision}
          </Text>
        )}
      </View>

      <Modal
        visible={resolucionOpen}
        onClose={() => setResolucionOpen(false)}
        title="Resolver PQRS"
      >
        <View className="gap-4">
          <Input
            label="Mensaje de resolución*"
            value={mensajeResolucion}
            onChangeText={setMensajeResolucion}
            placeholder="Describe cómo se resolvió…"
            multiline
          />
          <Button
            variant="primary"
            fullWidth
            disabled={!mensajeResolucion.trim()}
            loading={resolver.isPending}
            onPress={handleResolver}
          >
            Marcar como resuelta
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}
