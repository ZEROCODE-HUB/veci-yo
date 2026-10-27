import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Modal, Select, Cargando } from "@/shared/components";
import { PageHeader, DesplazableConTeclado } from "@/shared/layouts";
import { RegistroDeAsistentes, ZonaBanner } from "@/features/zonas/components";
import { useZonaDetalles } from "@/features/zonas/hooks/useZonaDetalles";
import { useUIStore } from "@/stores/ui-store";
import { FiltrosDeLaZona } from "../components/detalle/FiltrosDeLaZona";
import { GrillaDeHorarios } from "../components/detalle/GrillaDeHorarios";
import { MenuDeReservaDeZona } from "../components/detalle/MenuDeReservaDeZona";
import { CancelarReservaDeZona } from "../components/detalle/CancelarReservaDeZona";
import { IncidenciaDeReserva } from "../components/detalle/IncidenciaDeReserva";

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
    codigosDe,
    eliminarReserva,
    guardarAsistentes,
    guardandoAsistentes,
    deptoReservaOpen,
    setDeptoReservaOpen,
    deptoReserva,
    setDeptoReserva,
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
        onCancelar={() => {
          if (deleteItem) eliminarReserva(deleteItem.uuid ?? "");
          setDeleteItem(null);
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
          <Text className="text-sm text-gray-700 leading-6">
            {zonaConfig?.reglas || "Esta zona no tiene reglamento definido."}
          </Text>
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
          <Button
            fullWidth
            disabled={!deptoReserva}
            onPress={() => {
              setDeptoReservaOpen(false);
              navigation.navigate("ZonaReservar", {
                zonaId,
                ...deptoReservaTarget,
                deptoReserva,
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
