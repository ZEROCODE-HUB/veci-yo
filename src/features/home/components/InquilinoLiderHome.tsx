import { HoyDeMisViviendas } from "./HoyDeMisViviendas";
import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Modal } from "@/shared/components";
import { MisReservas } from "@/features/zonas/components";
import { useInquilinoLiderHome } from "../hooks/useInquilinoLiderHome";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { IngresosSalidasTable } from "./IngresosSalidasTable";
import { MisViviendas } from "./MisViviendas";
import { GratitudCard } from "./GratitudCard";
import { TuResumen } from "./TuResumen";
import { PrimeraPropiedad } from "./PrimeraPropiedad";
import { RecordatoriosDePreregistro } from "@/features/visitas/components/RecordatoriosDePreregistro";
import { BuscarEnPorteria } from "./BuscarEnPorteria";
import { AvisosDeMisHuespedes } from "./AvisosDeMisHuespedes";
import { EstacionamientosDeVisitaModal } from "./EstacionamientosDeVisitaModal";
import { useNavegacion } from "@/shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { obtenerReservas } from "@/features/zonas/services/zonas.repo";
import { formatDateInput } from "@/shared/utils";

const iconReputacion = require("@/assets/icons/inquilino-lider/reputacion.png");
const iconRegalos = require("@/assets/icons/inquilino-lider/regalos.png");
const imagenGratitud = require("@/assets/imagenes/gratitud.png");

export function InquilinoLiderHome() {
  const navigation = useNavegacion();
  const {
    estacionamientos,
    esAdmin,
    esGuardia,
    esResidente,
    sinPropiedades,
    esHuesped,
    noResidente,
    puedeVerTrafico,
    nombre,
    planDia,
    modoIngreso,
    barraPopup,
    parkingOpen,
    sourceData,
    diasParaGratitud,
    reputacionInsignias,
    visitas,
    HORAS_TURNO,
    COLOR_FAMILIARES,
    COLOR_TEMPORAL,
    usadoFamiliar,
    usadoTemporal,
    usadoVehiculos,
    usadoPorHora,
    maxVal,
    setPlanDia,
    setModoIngreso,
    setBarraPopup,
    setParkingOpen,
  } = useInquilinoLiderHome();
  // «06:00» en letra de 10 necesita unos 32 px de columna.
  const [anchoGrafico, setAnchoGrafico] = useState(0);
  const horasAlternas =
    anchoGrafico > 0 && anchoGrafico / HORAS_TURNO.length < 32;

  /*
    Las reservas de zonas de hoy, en la misma lista que los ingresos y salidas
    (pedido del cliente, 29/10/2026): la portería y la administración las ven
    sin entrar a otra pantalla.
  */
  const hoyIso = formatDateInput(new Date());
  const { data: reservas = [] } = useQuery({
    queryKey: ["zonas", "reservas-de-hoy-en-inicio", hoyIso],
    queryFn: () => obtenerReservas({ ambito: "condominio", unidadIds: [] }),
    enabled: esGuardia || esAdmin,
    refetchInterval: 60_000,
  });
  const reservasDeHoy = reservas
    .filter((r) => r.fechaIso === hoyIso && r.estado !== "Cancelado" && r.estado !== "Rechazado")
    .map((r) => {
      const [desde = "", hasta = ""] = r.horario.split(/\s*-\s*/);
      return {
        id: `reserva-${r.uuid ?? r.id}`,
        nombre: r.solicitante ?? "Reserva",
        tipo: `Reserva · ${r.nombre}`,
        depto: r.depto,
        horaIngreso: desde,
        horaSalida: hasta,
        estado: r.estado,
      };
    });

  return (
    <ScrollView
      className="flex-1 bg-bg-app"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/*
        Todas las viviendas de quien tiene mas de una, antes que nada: es lo
        que dice en cual esta y que pasa en las demas. A la porteria y a la
        administracion no les sale: su inicio es el del edificio.
      */}
      {!esGuardia && !esAdmin && <MisViviendas />}

      {sinPropiedades ? <PrimeraPropiedad /> : null}

      {/* Las estancias que llegan en 3 días o menos sin preregistro. */}
      {!esGuardia && !esAdmin ? <RecordatoriosDePreregistro /> : null}

      {/* La portería busca por nombre, departamento o QR del huésped. */}
      {esGuardia ? <BuscarEnPorteria /> : null}

      {/* Reputación — solo para residentes */}
      {esResidente && (
        <View
          className="bg-white rounded-xl p-4 items-center gap-2"
          style={{ boxShadow: theme.shadows.card }}
        >
          <Pressable onPress={() => navigateToRoute(navigation, "Reputacion")}>
            <Text className="text-base font-semibold text-gray-900 underline">
              Reputación
            </Text>
          </Pressable>
          <View
            className="items-center justify-center overflow-hidden"
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: theme.colors.primary,
              boxShadow: theme.shadows.fab,
            }}
          >
            <Image
              source={iconReputacion}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <View className="items-center">
            <Text className="text-base font-bold text-gray-900">{nombre}</Text>
            {/*
              Decision del 21/07/2026: la reputacion es acumulacion de
              insignias, SIN niveles ni progresion. El "Nivel Plata" que habia
              aqui era texto fijo y contradecia esa decision; el modelo de datos
              tampoco contempla niveles.
            */}
          </View>
          <View className="flex-row justify-between w-full mt-1">
            {reputacionInsignias.map((ins) => (
              <View key={ins.key} className="items-center gap-1.5 flex-1">
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: theme.colors.warningLight,
                  }}
                >
                  <Text style={{ fontSize: 17 }}>{ins.emoji}</Text>
                </View>
                <Text className="text-2xs text-gray-400 text-center">
                  {ins.cantidad}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/*
        Gratitud: solo residentes (no huéspedes), y solo cuando puede dar uno.
        Después de dar, vuelve a los 30 días (16/10/2026).
      */}
      {esResidente && !esHuesped && (
        <GratitudCard
          imagen={imagenGratitud}
          diasParaGratitud={diasParaGratitud}
          onPress={() => navigateToRoute(navigation, "CuadroHonor")}
        />
      )}

      {/*
        Aquí iba «Departamentos habilitados para renta corta» para residentes,
        y otro igual para el propietario no residente. Se quitaron el
        16/10/2026: esa lista es solo de la portería y la administración.
      */}

      {/*
        Lo suyo, no lo de sus huéspedes: correspondencia, zonas comunes y
        visitas, según le apliquen (QA 23/10/2026).
      */}
      {!esGuardia && !esAdmin && !esHuesped && !sinPropiedades ? (
        <TuResumen residente={esResidente} />
      ) : null}

      {/* Hoy y mañana en sus viviendas — también para el que no vive ahí. */}
      {noResidente && (
        <View
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: theme.shadows.card }}
        >
          <Text className="text-xl font-bold text-gray-900 mb-1">Hoy</Text>
          <HoyDeMisViviendas />
        </View>
      )}

      {/* Feed de notificaciones — propietario no residente */}
      {noResidente && (
        <View
          className="bg-white rounded-xl p-5 gap-3"
          style={{ boxShadow: theme.shadows.card }}
        >
          <Text className="text-xl font-bold text-gray-900">
            Notificaciones
          </Text>
          {/*
            Aquí había tres líneas escritas a fuego --«No hay anuncios
            nuevos», «No hay eventos próximos», «No hay chats pendientes»--
            que se enseñaban siempre, hubiera o no. Se quitaron el 14/10/2026:
            lo que pasa con sus huéspedes está en «Tus huéspedes», con datos.
          */}
          <Button
            fullWidth
            onPress={() => navigateToRoute(navigation, "Notificaciones")}
          >
            Ver todas las notificaciones
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => navigateToRoute(navigation, "CuadroHonor")}
          >
            Ver Ranking →
          </Button>
        </View>
      )}

      {/* Bloque de tráfico — Guardia y Administrador */}
      {puedeVerTrafico && (
        <>
          <View
            className="bg-white rounded-xl p-5 gap-3.5"
            style={{ boxShadow: theme.shadows.card }}
          >
            <Text className="text-xl font-bold text-gray-900">
              Tráfico de Ingresos y Salidas
            </Text>

            <View className="flex-row gap-1.5 justify-center">
              {["Ayer", "Hoy", "Mañana"].map((dia) => (
                <Pressable
                  key={dia}
                  onPress={() => setPlanDia(dia)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: planDia === dia }}
                  aria-selected={planDia === dia}
                  className="px-3 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      planDia === dia
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        planDia === dia
                          ? theme.colors.text
                          : theme.colors.textSecondary,
                    }}
                  >
                    {dia}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row gap-2.5 justify-center">
              <Pressable
                onPress={() => setModoIngreso(true)}
                className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full"
                style={{
                  backgroundColor: modoIngreso
                    ? theme.colors.secondary
                    : theme.colors.borderLight,
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={14}
                  color={
                    modoIngreso
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: modoIngreso
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary,
                  }}
                >
                  Ingresos
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setModoIngreso(false)}
                className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full"
                style={{
                  backgroundColor: !modoIngreso
                    ? theme.colors.secondary
                    : theme.colors.borderLight,
                }}
              >
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color={
                    !modoIngreso
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: !modoIngreso
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary,
                  }}
                >
                  Salidas
                </Text>
              </Pressable>
            </View>

            {/* Bar chart — dual side-by-side bars per hour (matching web) */}
            <View
              className="flex-row items-end gap-1"
              style={{ height: 130, paddingHorizontal: 2 }}
              onLayout={(e) => setAnchoGrafico(e.nativeEvent.layout.width)}
            >
              {HORAS_TURNO.map((hora, i) => {
                const fVal = usadoFamiliar[i] || 0;
                const tVal = usadoTemporal[i] || 0;
                const altF = maxVal > 0 ? (fVal / maxVal) * 100 : 0;
                const altT = maxVal > 0 ? (tVal / maxVal) * 100 : 0;
                return (
                  <Pressable
                    key={hora}
                    onPress={() => {
                      const tipo = modoIngreso ? "ingresos" : "salidas";
                      setBarraPopup({
                        hora,
                        total: usadoPorHora[i] || 0,
                        familiar: fVal,
                        temporal: tVal,
                        vehiculos: usadoVehiculos[i] || 0,
                        tipo,
                      });
                    }}
                    className="flex-1 items-center gap-0.5"
                  >
                    {/* Two bars side by side */}
                    <View
                      className="w-full flex-row items-end justify-center"
                      style={{ height: 80, gap: 2 }}
                    >
                      <View
                        style={{
                          width: "40%",
                          maxWidth: 12,
                          height: Math.max(2, altF),
                          borderRadius: 3,
                          backgroundColor: COLOR_FAMILIARES,
                          opacity: 0.85,
                        }}
                      />
                      <View
                        style={{
                          width: "40%",
                          maxWidth: 12,
                          height: Math.max(2, altT),
                          borderRadius: 3,
                          backgroundColor: COLOR_TEMPORAL,
                          opacity: 0.85,
                        }}
                      />
                    </View>
                    {/*
                      Una hora de cada dos cuando la columna no da para «06:00»
                      entera: en 320 y 360 salía «06:…» en todas (auditoría de
                      responsividad, 25/10/2026). El hueco lleva un espacio duro
                      --uno normal, en la web, no ocupa alto-- para que todas
                      las barras queden a la misma altura.
                    */}
                    <Text
                      className="text-2xs text-gray-400 text-center"
                      numberOfLines={1}
                      // Más ancha que su columna: se apoya en la de al lado,
                      // que va vacía.
                      style={horasAlternas ? { width: 40, maxWidth: 40, flexShrink: 0 } : undefined}
                    >
                      {horasAlternas && i % 2 === 1 ? "\u00a0" : hora}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-2.5">
              <View className="flex-row items-center gap-1">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: COLOR_FAMILIARES,
                  }}
                />
                <Text className="text-2xs text-gray-400">
                  Familiares y Amigos
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: COLOR_TEMPORAL,
                  }}
                />
                <Text className="text-2xs text-gray-400">
                  Huéspedes Temporales
                </Text>
              </View>
            </View>
          </View>

          {/*
            Renta corta, para Guardia y Admin. El nombre es el acordado con el
            cliente y se respeta tal cual (KT 8.5), aunque la maqueta diga
            «Departamentos habilitados para renta corta» (corregido el 16/10/2026).
          */}
          {(esAdmin || esGuardia) && (
            <Pressable
              onPress={() => navigateToRoute(navigation, "Reglas")}
              className="w-full py-3 rounded-full bg-primary"
            >
              <Text className="text-sm font-semibold text-gray-900 text-center">
                Reglamentos y renta corta
              </Text>
            </Pressable>
          )}

          {/*
            Correspondencia, para la porteria.

            Es quien recibe los paquetes, y **no tenia por donde llegar**: la
            pantalla existe, le da el boton de «+» --`rolActivo === "guardia"`--
            y la politica le deja ver la del edificio entero, pero el unico
            camino en toda la aplicacion era «Viviendas → Correspondencia», y el
            guardia no tiene pestaña de Viviendas.

            No lo ve `buscar-pantallas-inalcanzables`, que comprueba que la
            navegacion registre la pantalla: registrada estaba. Lo que faltaba
            era la puerta para el rol que la necesita.
          */}
          {esGuardia && (
            <View
              className="bg-white rounded-xl p-4 flex-row items-center justify-between"
              style={{ boxShadow: theme.shadows.card }}
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Text style={{ fontSize: 20 }}>📮</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Correspondencia
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Registrar la paquetería que llega y entregarla
                  </Text>
                </View>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => navigateToRoute(navigation, "Correspondencia")}
                className="px-3.5 py-1.5 rounded-full bg-primary"
              >
                <Text className="text-xs font-semibold text-white">Ver</Text>
              </Pressable>
            </View>
          )}

          {/* Directorio de Propiedades */}
          <View
            className="bg-white rounded-xl p-4 flex-row items-center justify-between"
            style={{ boxShadow: theme.shadows.card }}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Text style={{ fontSize: 20 }}>🏢</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Directorio de Propiedades
                </Text>
                <Text className="text-xs text-gray-500">
                  Buscar por torre, ver deptos, estacionamientos y depósitos
                  asociados
                </Text>
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() =>
                navigateToRoute(navigation, "DirectorioPropiedades")
              }
              className="px-3.5 py-1.5 rounded-full bg-primary"
            >
              <Text className="text-xs font-semibold text-white">Ver</Text>
            </Pressable>
          </View>

          {/*
            Estacionamientos de visita: solo la portería, que es quien los
            asigna al registrar una visita (cliente, 16/10/2026).
          */}
          {esGuardia && (
            <View
              className="bg-white rounded-xl p-4 flex-row items-center justify-between"
              style={{ boxShadow: theme.shadows.card }}
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Text style={{ fontSize: 20 }}>🅿️</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Estacionamientos de visita
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {estacionamientos.total - estacionamientos.ocupados} de{" "}
                    {estacionamientos.total} disponibles
                  </Text>
                </View>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => setParkingOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-primary"
              >
                <Text className="text-xs font-semibold text-white">
                  Administrar
                </Text>
              </Pressable>
            </View>
          )}

          {/* Admin: gestión de guardias */}
          {esAdmin && (
            <View
              className="bg-white rounded-xl p-4 flex-row items-center justify-between"
              style={{ boxShadow: theme.shadows.card }}
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Text style={{ fontSize: 20 }}>👮</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Asignación de guardias de seguridad
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Alta/baja de turnos, horarios recurrentes, rotaciones,
                    ajuste manual
                  </Text>
                </View>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  navigateToRoute(navigation, "AdministradorSeguridad")
                }
                className="px-3.5 py-1.5 rounded-full bg-primary"
              >
                <Text className="text-xs font-semibold text-white">
                  Gestionar
                </Text>
              </Pressable>
            </View>
          )}

          {/* Tabla resumen de ingresos y salidas */}
          <View
            className="bg-white rounded-xl p-5 gap-3"
            style={{ boxShadow: theme.shadows.card }}
          >
            {/*
              Con `flex-wrap`: en un celular de 320, o con la letra grande,
              «Ver detalle» y «Registrar» no caben junto al título y se salían
              de la tarjeta; ahora bajan a la línea de abajo (auditoría de
              responsividad, 25/10/2026).
            */}
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-lg font-bold text-gray-900">
                Ingresos, salidas y reservas
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  hitSlop={8}
                  onPress={() => navigateToRoute(navigation, "Visitas")}
                  className="px-3.5 py-1.5 rounded-full bg-primary"
                >
                  <Text className="text-xs font-semibold text-white">
                    Ver detalle
                  </Text>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => navigateToRoute(navigation, "VisitasNuevo")}
                  className="px-3.5 py-1.5 rounded-full bg-secondary"
                >
                  <Text className="text-xs font-semibold text-white">
                    Registrar
                  </Text>
                </Pressable>
                {/* Las reservas de zonas, a mano de la portería (29/10/2026). */}
                {esGuardia ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => navigateToRoute(navigation, "ReservasPorteria")}
                    className="px-3.5 py-1.5 rounded-full border border-primary"
                  >
                    <Text className="text-xs font-semibold text-primary">Reservas</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <IngresosSalidasTable
              data={[...sourceData, ...reservasDeHoy].sort((a, b) =>
                (a.horaIngreso ?? "").localeCompare(b.horaIngreso ?? ""),
              )}
              vacio="Hoy no hay ingresos, salidas ni reservas"
            />
          </View>
        </>
      )}

      {/* Hoy — oculto para guardia y no-residentes */}
      {!esGuardia && esResidente && (
        <View
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: theme.shadows.card }}
        >
          <Text className="text-xl font-bold text-gray-900 mb-1">Hoy</Text>

          {!esHuesped ? (
            <Pressable
              onPress={() => navigation.navigate("CuadroHonor")}
              className="flex-row items-center justify-between py-3.5"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.borderLight,
              }}
            >
              {/*
              «Regalos por dar 0» no dice nada. Desde el 03/10/2026 la regla es
              uno al mes por persona --lo pidió el cliente-- así que el número
              solo puede ser 1 o 0, y vale más decirlo con palabras que dejar
              un cero que se lee como un error.
            */}
              <Text className="text-base text-gray-900">
                {diasParaGratitud === 0
                  ? "Puedes dar tu reconocimiento"
                  : diasParaGratitud === 1
                    ? "Mañana podrás dar un nuevo reconocimiento"
                    : `En ${diasParaGratitud} días podrás dar un nuevo reconocimiento`}
              </Text>
              <View
                className="items-center justify-center rounded-full overflow-hidden"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: theme.colors.dangerLight,
                }}
              >
                <Image
                  source={iconRegalos}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          ) : null}

          {/*
            Aquí iba la agenda del día (visitas programadas, título y hora).
            Desde el 16/10/2026 es la tabla de la portería con lo de sus
            viviendas, hoy y mañana, con filtros (responsable de producto).
          */}
          {!esHuesped ? <HoyDeMisViviendas /> : null}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.borderLight,
              marginTop: 4,
            }}
          >
            <MisReservas hideIfEmpty soloDeHoy />
          </View>
        </View>
      )}

      {/*
        Lo último que pasó con sus huéspedes (14/10/2026). Va debajo de «Hoy»
        y no arriba del todo: en la maqueta el Inicio abre con Reputación
        (comparación con la maqueta, 16/10/2026).
      */}
      {!esGuardia && !esAdmin ? <AvisosDeMisHuespedes /> : null}

      <EstacionamientosDeVisitaModal
        visible={parkingOpen}
        onClose={() => setParkingOpen(false)}
        visitas={visitas}
      />

      {/* Popup detalle por hora — matching web */}
      <Modal
        visible={!!barraPopup}
        onClose={() => setBarraPopup(null)}
        title={barraPopup?.hora || ""}
      >
        {barraPopup && (
          <View className="gap-3.5 py-2">
            <Text className="text-base font-semibold text-gray-900 text-center">
              Total {barraPopup.tipo === "ingresos" ? "ingresos" : "salidas"}:{" "}
              {barraPopup.total}
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              🚗 {barraPopup.vehiculos}{" "}
              {barraPopup.tipo === "ingresos" ? "ingresos" : "salidas"} con
              vehículo
            </Text>
            <View className="flex-row justify-center gap-4">
              <View className="flex-row items-center gap-1">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: COLOR_FAMILIARES,
                  }}
                />
                <Text className="text-sm text-gray-500">
                  Familiares: {barraPopup.familiar}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: COLOR_TEMPORAL,
                  }}
                />
                <Text className="text-sm text-gray-500">
                  Huéspedes: {barraPopup.temporal}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}
