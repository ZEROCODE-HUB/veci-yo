import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Input, Modal, Select, Cargando, ErrorAlCargar } from "@/shared/components";
import { PageHeader, DesplazableConTeclado } from "@/shared/layouts";
import { RegistroDeAsistentes, ZonaBanner } from "@/features/zonas/components";
import { useZonaDetalles } from "@/features/zonas/hooks/useZonaDetalles";
import { useUIStore } from "@/stores/ui-store";
import { FiltrosDeLaZona } from "../components/detalle/FiltrosDeLaZona";
import { GrillaDeHorarios } from "../components/detalle/GrillaDeHorarios";
import { MenuDeReservaDeZona } from "../components/detalle/MenuDeReservaDeZona";
import { CancelarReservaDeZona } from "../components/detalle/CancelarReservaDeZona";
import { IncidenciaDeReserva } from "../components/detalle/IncidenciaDeReserva";
import { DocumentoDelReglamento } from "../components/DocumentoDelReglamento";

/**
 * Detalle de una zona comun. Solo composicion: el estado y las reglas viven en
 * `useZonaDetalles`.
 */
export function ZonaDetallesScreen() {
  const z = useZonaDetalles();
  const {
    navigation,
    zonaId,
    zona,
    zonaConfig,
    cargando,
    falloZonas,
    reintentarZonas,
    codigosDe,
    eliminarReservaAsync,
    cancelandoReserva,
    guardarAsistentes,
    guardandoAsistentes,
    deptoReservaOpen,
    setDeptoReservaOpen,
    deptoReserva,
    setDeptoReserva,
    anotacionesReserva,
    setAnotacionesReserva,
    deptoReservaTarget,
    detailItem,
    setDetailItem,
    deleteItem,
    setDeleteItem,
    ruleOpen,
    setRuleOpen,
    diasAdelanto,
    duracionMaximaMin,
  } = z;
  const addToast = useUIStore((s) => s.addToast);

  // Sin los parámetros del edificio no se sabe qué días ni qué horas ofrecer:
  // se espera, igual que a la zona (`cargando` cuenta las dos cosas).
  if (!zona || diasAdelanto == null || duracionMaximaMin == null) {
    return (
      <View className="flex-1 bg-white">
        <PageHeader title="Zona común" />
        {/*
          Dos cosas distintas, y antes compartían un `Text`: mientras carga se
          dice que carga, y cuando ya se sabe que no está, se dice eso. Juntarlas
          en una ternaria hacía que el «ya no está disponible» pareciera un
          estado de carga más.
        */}
        {cargando ? (
          <Cargando texto="la zona" />
        ) : falloZonas ? (
          // Una red caída no es una zona borrada (13/11/2026).
          <ErrorAlCargar texto="la zona" reintentar={reintentarZonas} />
        ) : (
          <Text className="text-center text-gray-500 py-10">
            Esta zona común ya no está disponible.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/*
        Aqui habia un «+» que abria el formulario **en blanco**. Era una
        segunda puerta a lo mismo y, ademas, peor: el desplegable de horas del
        formulario no mira la ocupacion, asi que desde ahi se podia elegir una
        franja llena y no enterarse hasta que la base rechazaba el guardado.
        Se reserva desde la grilla, que es donde se ve lo que esta libre.
      */}
      <PageHeader title={zona.nombre} />
      <DesplazableConTeclado className="flex-1" contentContainerClassName="p-3 gap-2.5">
        <ZonaBanner zona={zona} />
        <Pressable
          onPress={() => setRuleOpen(true)}
          className="items-center rounded-xl py-2.5 border border-gray-200"
        >
          <Text className="text-sm font-semibold text-gray-500">
            📋 Reglamento de la zona
          </Text>
        </Pressable>
        <FiltrosDeLaZona zona={z} dias={diasAdelanto} />
        <GrillaDeHorarios
          zona={z}
          usaSlots={zona.usaSlots}
          duracionMaximaMin={duracionMaximaMin}
        />
      </DesplazableConTeclado>

      <MenuDeReservaDeZona zona={z} />
      <CancelarReservaDeZona
        visible={!!deleteItem}
        onVolver={() => setDeleteItem(null)}
        cancelando={Boolean(cancelandoReserva)}
        onCancelar={() => {
          if (!deleteItem) return;
          /*
            Se espera a la base: antes se cerraba al pulsar y, si fallaba, la
            reserva seguía ahí sin que la ventana lo dijera. El motivo del
            fallo lo avisa `useZonas`; aquí solo no se cierra.
          */
          eliminarReservaAsync(deleteItem.uuid ?? "")
            .then(() => setDeleteItem(null))
            .catch(() => {});
        }}
      />
      <Modal
        visible={!!ruleOpen}
        onClose={() => setRuleOpen(false)}
        title="Reglamento de la zona"
      >
        <View className="gap-4">
          <Text className="font-bold text-base text-gray-900">
            {zona.nombre}
          </Text>
          {zonaConfig?.reglas || !zonaConfig?.reglamentoArchivo ? (
            <Text className="text-sm text-gray-700 leading-6">
              {zonaConfig?.reglas || "Esta zona no tiene reglamento definido."}
            </Text>
          ) : null}
          {/* El documento, si lo subió la administración (Para Claude 201). */}
          <DocumentoDelReglamento
            ruta={zonaConfig?.reglamentoArchivo}
            nombre={zonaConfig?.reglamentoArchivoNombre}
          />
          <Button fullWidth onPress={() => setRuleOpen(false)}>
            Entendido
          </Button>
        </View>
      </Modal>
      <Modal
        visible={deptoReservaOpen}
        onClose={() => setDeptoReservaOpen(false)}
        title="¿Para qué departamento es la reserva?"
      >
        <View className="gap-4">
          <Select
            label="Departamento"
            value={deptoReserva || null}
            options={codigosDe()}
            onChange={(value) => setDeptoReserva(String(value))}
            placeholder="Elige el departamento"
          />
          {/* Correcciones fila 12: lo que quiera dejar anotado la portería. */}
          <Input
            label="Anotaciones (opcional)"
            value={anotacionesReserva}
            onChangeText={setAnotacionesReserva}
            placeholder="Por ejemplo: lo pidió por el citófono"
            multiline
            rows={2}
            showEditIcon={false}
          />
          <Button
            fullWidth
            disabled={!deptoReserva}
            onPress={() => {
              setDeptoReservaOpen(false);
              navigation.navigate("ZonaReservar", {
                zonaId,
                ...deptoReservaTarget,
                deptoReserva,
                anotaciones: anotacionesReserva.trim() || undefined,
              });
            }}
          >
            Continuar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Editar personas en la reserva"
      >
        {detailItem ? (
          <RegistroDeAsistentes
            reserva={detailItem}
            guardando={guardandoAsistentes}
            onGuardar={async (personas) => {
              await guardarAsistentes({
                reservaUuid: detailItem.uuid ?? "",
                personas,
              });
              setDetailItem(null);
              addToast("Asistencia registrada correctamente", "success");
            }}
          />
        ) : null}
      </Modal>
      <IncidenciaDeReserva zona={z} nombreDeLaZona={zona.nombre} />
    </View>
  );
}
