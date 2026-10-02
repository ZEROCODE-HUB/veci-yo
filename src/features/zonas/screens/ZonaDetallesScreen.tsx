import { theme } from "@/config";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  BottomSheet,
  BottomSheetOption,
  Button,
  Calendar,
  Input,
  Modal,
  Select,
} from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { FranjaHoraria, TiraDeDias, ZonaBanner } from "@/features/zonas/components";
import { useZonaDetalles } from "@/features/zonas/hooks/useZonaDetalles";
import { formatZonaDateParam, horasMaximas } from "../helpers";
import { comoFiltro } from "../services/tiraDeDias";
import { formatDate } from "@/shared/utils";

/**
 * Detalle de una zona comun. Solo composicion: el estado y las reglas viven en
 * `useZonaDetalles`.
 */
export function ZonaDetallesScreen() {
  const {
    navigation,
    zonaId,
    zona,
    zonaConfig,
    cargando,
    esGuardiaAdmin,
    esGuardia,
    codigosDe,
    eliminarReserva,
    actualizarPersonaReserva,
    dayFilter,
    diaDeLaGrilla,
    setDayFilter,
    selectedDate,
    setSelectedDate,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    datePicker,
    setDatePicker,
    deptoReservaOpen,
    setDeptoReservaOpen,
    deptoReserva,
    setDeptoReserva,
    deptoReservaTarget,
    menuItem,
    setMenuItem,
    detailItem,
    setDetailItem,
    deleteItem,
    setDeleteItem,
    incidenciaItem,
    setIncidenciaItem,
    incidenciaTexto,
    setIncidenciaTexto,
    ruleOpen,
    setRuleOpen,
    personNames,
    setPersonNames,
    freeHours,
    abrirReserva,
    openPeople,
  } = useZonaDetalles();

  if (!zona) {
    return (
      <View className="flex-1 bg-white">
        <PageHeader title="Zona común" />
        <Text className="text-center text-gray-500 py-10">
          {cargando ? "Cargando..." : "Esta zona común ya no está disponible."}
        </Text>
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
      <ScrollView className="flex-1" contentContainerClassName="p-3 gap-2.5">
        <ZonaBanner zona={zona} />
        <Pressable
          onPress={() => setRuleOpen(true)}
          className="items-center rounded-xl py-2.5 border border-gray-200"
        >
          <Text className="text-sm font-semibold text-gray-500">
            📋 Reglamento de la zona
          </Text>
        </Pressable>
        <View
          className="bg-white rounded-2xl p-3 gap-2.5"
          style={{
            elevation: 3,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {/*
            Aqui habia una seccion «Lista de reservas · Buscar y filtrar»,
            plegable, con un buscador por departamento y seis chips de estado
            --Todos, Reservado, Aprobado, Pendiente, No disp., Disponible--.

            **No filtraban nada.** Alimentaban `filtered`, que la pantalla
            recibia y no pintaba en ningun sitio: la lista de reservas que
            prometia el titulo no existe. Lo unico de esa seccion que cambiaba
            algo era la fecha, que decide que dia pinta la grilla.

            Lo vio el cliente: «ese filtro de Todos, Reservado, Aprobado,
            Pendiente no hace nada, no?». Y de paso pidio la tira de dias
            directa, sin desplegar: era el unico control util, escondido
            detras de cinco inutiles.
          */}
          <TiraDeDias
            seleccionado={diaDeLaGrilla}
            onSeleccionar={(dia) => {
              const filtro = comoFiltro(dia);
              setDayFilter(filtro.dayFilter);
              setSelectedDate(filtro.selectedDate);
              setFechaDesde(null);
              setFechaHasta(null);
            }}
          />
          {/*
            El rango es para **buscar** en la lista de todo el edificio, no
            para reservar. Un vecino solo ve sus propias reservas.
          */}
          {esGuardiaAdmin && (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  setDatePicker("desde");
                  setDayFilter(null);
                }}
                className="flex-1 rounded-xl px-3 py-2 border border-gray-200"
              >
                <Text className="text-[11px] text-gray-500">Desde</Text>
                <Text className="text-sm text-gray-900">
                  {fechaDesde ? formatDate(fechaDesde) : "Seleccionar fecha"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDatePicker("hasta");
                  setDayFilter(null);
                }}
                className="flex-1 rounded-xl px-3 py-2 border border-gray-200"
              >
                <Text className="text-[11px] text-gray-500">Hasta</Text>
                <Text className="text-sm text-gray-900">
                  {fechaHasta ? formatDate(fechaHasta) : "Seleccionar fecha"}
                </Text>
              </Pressable>
              {(fechaDesde || fechaHasta) && (
                <Pressable
                  onPress={() => {
                    setFechaDesde(null);
                    setFechaHasta(null);
                    setDayFilter("hoy");
                  }}
                >
                  <Text className="text-xs text-gray-500 underline">
                    Limpiar
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        <View
          className="bg-white rounded-2xl p-3"
          style={{
            elevation: 3,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            {zona.usaSlots
              ? "Horarios disponibles"
              : `Horario libre (máx ${horasMaximas(zona.duracionMaximaMin)} h)`}
          </Text>
          {/*
            `selectedDate` faltaba en la cuenta. Con la tira de dias, elegir
            cualquier dia que no sea hoy ni mañana deja `dayFilter` en nulo y
            la fecha en `selectedDate`, asi que la grilla desaparecia y pedia
            elegir un dia **que acababa de elegirse**. El mensaje tampoco
            hablaba ya el idioma de la pantalla.
          */}
          {!dayFilter && !selectedDate && !fechaDesde && !fechaHasta ? (
            <Text className="text-xs text-gray-500">
              Elige un día en la tira de arriba para ver los horarios.
            </Text>
          ) : (
            freeHours.map(({ hour, reservations, ajenas, libres, cupos }) => (
              <FranjaHoraria
                key={hour}
                hora={hour}
                reservas={reservations}
                esGestion={esGuardiaAdmin}
                ajenas={ajenas}
                libres={libres}
                cupos={cupos}
                onSeleccionar={setMenuItem}
                onReservar={() =>
                  abrirReserva(
                    hour,
                    formatZonaDateParam(
                      fechaDesde || selectedDate || new Date(),
                    ),
                  )
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={!!menuItem} onClose={() => setMenuItem(null)}>
        {esGuardia ? (
          <>
            <BottomSheetOption
              label="Editar personas en la reserva"
              onPress={() => {
                if (menuItem) openPeople(menuItem);
                setMenuItem(null);
              }}
            />
            <BottomSheetOption
              label="Añadir incidencia"
              onPress={() => {
                setIncidenciaItem(menuItem);
                setIncidenciaTexto("");
                setMenuItem(null);
              }}
            />
          </>
        ) : (
          menuItem && (
            <>
              {/*
                Aqui estaban «Aprobar reserva», «Rechazar reserva» y tres
                cambios de estado a mano --Reservado, Disponible, No
                disponible--, todos condicionados a `rol === "administrador"`.

                Eran el unico sitio donde se podia resolver una reserva, y
                vivian **en la pantalla del residente**, escondidos tras el
                menu de una reserva. La pantalla que se llama «Gestion de Zonas
                Comunes» era justo la que no dejaba resolver nada (R-37).

                Ya no: la administracion tiene Aprobar y Rechazar en su propia
                pantalla, que es donde se buscan. Esta se queda con lo que
                cualquiera puede hacer con **su** reserva, y deja de cambiar de
                funciones segun quien mire.

                Decidido con el cliente el 02/10/2026.
              */}
              <BottomSheetOption
                /*
                  Decia «Eliminar» y no elimina: la reserva queda `cancelada`,
                  que es lo correcto --una reserva cancelada es una constancia,
                  y la franja se libera igual--. El aviso de debajo ya decia
                  «cancelar»; la palabra del boton era la que sobraba.
                */
                label="Cancelar reserva"
                variant="danger"
                onPress={() => {
                  setDeleteItem(menuItem);
                  setMenuItem(null);
                }}
              />
            </>
          )
        )}
      </BottomSheet>
      <Modal
        visible={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Cancelar reserva"
      >
        <View className="gap-4">
          <Text className="text-sm text-gray-600 text-center">
            ¿Seguro que desea cancelar esta reserva? La franja vuelve a quedar
            libre para otros vecinos.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              {/*
                «Volver» y no «Cancelar»: en este modal cancelar es justo lo
                que hace el otro boton, y dos botones con la misma palabra y
                efectos opuestos es peor que la palabra mal puesta de antes.
              */}
              <Button variant="secondary" onPress={() => setDeleteItem(null)}>
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                onPress={() => {
                  if (deleteItem) eliminarReserva(deleteItem.uuid ?? "");
                  setDeleteItem(null);
                }}
              >
                Cancelar reserva
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
        visible={!!datePicker}
        onClose={() => setDatePicker(null)}
        title={datePicker === "desde" ? "Fecha desde" : "Fecha hasta"}
      >
        <Calendar
          selected={datePicker === "desde" ? fechaDesde : fechaHasta}
          onSelect={(date) => {
            if (datePicker === "desde") setFechaDesde(date);
            else setFechaHasta(date);
            setDatePicker(null);
          }}
        />
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
            placeholder="Seleccione el departamento"
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
        title="Editar personas"
      >
        <View className="gap-3">
          {detailItem &&
            personNames.map((name, index) => (
              <Input
                key={index}
                value={name}
                onChangeText={(value) =>
                  setPersonNames((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? value : item,
                    ),
                  )
                }
                placeholder={`Nombre del asistente ${index + 1}`}
              />
            ))}
          <Button
            fullWidth
            onPress={() => {
              if (detailItem)
                // Cada participante se identifica por su uuid, no por su
                // posicion en el array.
                personNames.forEach((name, index) => {
                  const participante = detailItem.personas[index];
                  if (participante?.uuid)
                    actualizarPersonaReserva(participante.uuid, {
                      nombre: name,
                    });
                });
              setDetailItem(null);
            }}
          >
            Guardar cambios
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!incidenciaItem}
        onClose={() => {
          setIncidenciaItem(null);
          setIncidenciaTexto("");
        }}
        title="Registrar comentario o incidencia"
      >
        {incidenciaItem && (
          <View className="gap-4">
            <View className="rounded-2xl border-[1.5px] border-primary p-3.5 gap-1.5">
              <Text className="text-base font-bold text-gray-900">
                {incidenciaItem.depto}
              </Text>
              <Text className="text-sm text-gray-500">
                Reserva N°:{incidenciaItem.reservaNum} ·{" "}
                {incidenciaItem.horario}
              </Text>
            </View>
            <Input
              value={incidenciaTexto}
              onChangeText={setIncidenciaTexto}
              placeholder="Describa el comentario o incidencia..."
              multiline
              rows={5}
              showEditIcon={false}
            />
            <Button
              fullWidth
              disabled={!incidenciaTexto.trim()}
              onPress={() => {
                setIncidenciaItem(null);
                setIncidenciaTexto("");
              }}
            >
              Enviar a PQRs
            </Button>
          </View>
        )}
      </Modal>
    </View>
  );
}
