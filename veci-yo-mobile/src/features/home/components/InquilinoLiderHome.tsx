import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Modal, Select } from "@/shared/components";
import { MisReservas } from "@/features/zonas/components";
import { useInquilinoLiderHome } from "../hooks/useInquilinoLiderHome";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";

const iconReputacion = require("@/assets/icons/inquilino-lider/reputacion.png");
const iconRegalos = require("@/assets/icons/inquilino-lider/regalos.png");
const imagenGratitud = require("@/assets/imagenes/gratitud.png");

export function InquilinoLiderHome() {
  const navigation = useNavigation<any>();
  const {
    agendaHoy,
    estacionamientos,
    esAdmin,
    esGuardia,
    esResidente,
    noResidente,
    puedeVerTrafico,
    nombre,
    planDia,
    modoIngreso,
    barraPopup,
    parkingOpen,
    parkingAssignments,
    sourceData,
    regalosPorDar,
    reputacionInsignias,
    visitOptions,
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
    setParkingAssignments,
    openParking,
    saveParking,
  } = useInquilinoLiderHome();

  return (
    <ScrollView
      className="flex-1 bg-bg-app"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* Reputación — solo para residentes */}
      {esResidente && (
        <View
          className="bg-white rounded-xl p-5 items-center gap-3"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <Pressable
            onPress={() =>
              navigateToRoute(navigation, "Reputacion")
            }
          >
            <Text className="text-base font-semibold text-gray-900 underline">
              Reputación
            </Text>
          </Pressable>
          <View
            className="items-center justify-center overflow-hidden"
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "#F5B800",
              boxShadow: "0 4px 20px rgba(245,184,0,0.35)",
            }}
          >
            <Image
              source={iconReputacion}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900">{nombre}</Text>
            <Text className="text-sm text-gray-500">Nivel Plata</Text>
          </View>
          <View className="flex-row justify-between w-full mt-1">
            {reputacionInsignias.map((ins) => (
              <View key={ins.key} className="items-center gap-1.5 flex-1">
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 52, height: 52, backgroundColor: "#FEF3C7" }}
                >
                  <Text style={{ fontSize: 22 }}>{ins.emoji}</Text>
                </View>
                <Text className="text-2xs text-gray-400 text-center">
                  {ins.cantidad}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Gratitud — solo para residentes */}
      {esResidente && (
        <Pressable
          onPress={() =>
            navigateToRoute(navigation, "CuadroHonor")
          }
          className="rounded-xl overflow-hidden"
          style={{ minHeight: 180, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <Image
            source={imagenGratitud}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/50" />
          <View className="relative items-center justify-center flex-1 py-5 px-4">
            <View className="items-center gap-1.5 mb-2.5">
              <Ionicons name="people" size={32} color="#FFFFFF" />
            </View>
            <Text
              className="relative text-[28px] font-bold text-white mb-1.5"
              style={{
                letterSpacing: 1.5,
                textShadowColor: "rgba(0,0,0,0.3)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
            >
              Gratitud
            </Text>
            <Text
              className="relative text-sm text-white/90 text-center max-w-[260px]"
              style={{ textShadowColor: "0 1px 4px rgba(0,0,0,0.2)" }}
            >
              Reconoce a tu comunidad con regalos y colaboración.
            </Text>
          </View>
        </Pressable>
      )}

      {/* Renta corta — residentes */}
      {esResidente && (
        <Pressable
          onPress={() =>
            navigateToRoute(navigation, "Reglas")
          }
          className="w-full py-3 rounded-full bg-primary"
        >
          <Text className="text-sm font-semibold text-gray-900 text-center">
            Departamentos habilitados para renta corta
          </Text>
        </Pressable>
      )}

      {/* Feed de notificaciones — propietario no residente */}
      {noResidente && (
        <View
          className="bg-white rounded-xl p-5 gap-3"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <Text className="text-xl font-bold text-gray-900">
            Notificaciones
          </Text>
          <View className="gap-2.5">
            {[
              { icon: "📢", label: "No hay anuncios nuevos" },
              { icon: "📅", label: "No hay eventos próximos" },
              { icon: "💬", label: "No hay chats pendientes" },
            ].map((notification, index, notifications) => (
              <View
                key={notification.label}
                className="flex-row items-center gap-2.5 py-2.5"
                style={{
                  borderBottomWidth: index === notifications.length - 1 ? 0 : 1,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <Text style={{ fontSize: 24 }}>{notification.icon}</Text>
                <Text className="text-sm text-gray-900">
                  {notification.label}
                </Text>
              </View>
            ))}
          </View>
          <Button
            fullWidth
            onPress={() =>
              navigateToRoute(navigation, "Notificaciones")
            }
          >
            Ver todas las notificaciones
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() =>
              navigateToRoute(navigation, "CuadroHonor")
            }
          >
            Ver Ranking →
          </Button>
        </View>
      )}

      {/* Acceso a departamentos habilitados — propietario no residente */}
      {noResidente && (
        <Pressable
          onPress={() =>
            navigateToRoute(navigation, "Reglas")
          }
          className="w-full py-3 rounded-full bg-primary"
        >
          <Text className="text-sm font-semibold text-gray-900 text-center">
            Ver departamentos habilitados para renta corta
          </Text>
        </Pressable>
      )}

      {/* Bloque de tráfico — Guardia y Administrador */}
      {puedeVerTrafico && (
        <>
          <View
            className="bg-white rounded-xl p-5 gap-3.5"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <Text className="text-xl font-bold text-gray-900">
              Tráfico de Ingresos y Salidas
            </Text>

            <View className="flex-row gap-1.5 justify-center">
              {["Ayer", "Hoy", "Mañana"].map((dia) => (
                <Pressable
                  key={dia}
                  onPress={() => setPlanDia(dia)}
                  className="px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: planDia === dia ? "#F5B800" : "#F3F4F6",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: planDia === dia ? "#111827" : "#6B7280" }}
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
                style={{ backgroundColor: modoIngreso ? "#2563EB" : "#F3F4F6" }}
              >
                <Ionicons
                  name="arrow-up"
                  size={14}
                  color={modoIngreso ? "#fff" : "#6B7280"}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: modoIngreso ? "#fff" : "#6B7280" }}
                >
                  Ingresos
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setModoIngreso(false)}
                className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full"
                style={{
                  backgroundColor: !modoIngreso ? "#2563EB" : "#F3F4F6",
                }}
              >
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color={!modoIngreso ? "#fff" : "#6B7280"}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: !modoIngreso ? "#fff" : "#6B7280" }}
                >
                  Salidas
                </Text>
              </Pressable>
            </View>

            {/* Bar chart — dual side-by-side bars per hour (matching web) */}
            <View
              className="flex-row items-end gap-1"
              style={{ height: 130, paddingHorizontal: 2 }}
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
                    <Text className="text-2xs text-gray-400" numberOfLines={1}>
                      {hora}
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

          {/* Renta corta — también para Guardia y Admin (como en web) */}
          {(esAdmin || esGuardia) && (
            <Pressable
              onPress={() =>
                navigateToRoute(navigation, "Reglas")
              }
              className="w-full py-3 rounded-full bg-primary"
            >
              <Text className="text-sm font-semibold text-gray-900 text-center">
                Departamentos habilitados para renta corta
              </Text>
            </Pressable>
          )}

          {/* Directorio de Propiedades */}
          <View
            className="bg-white rounded-xl p-4 flex-row items-center justify-between"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
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
              onPress={() =>
                navigateToRoute(navigation, "DirectorioPropiedades")
              }
              className="px-3.5 py-1.5 rounded-full bg-primary"
            >
              <Text className="text-xs font-semibold text-white">Ver</Text>
            </Pressable>
          </View>

          {/* Estacionamientos de visita */}
          <View
            className="bg-white rounded-xl p-4 flex-row items-center justify-between"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
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
              onPress={openParking}
              className="px-3.5 py-1.5 rounded-full bg-primary"
            >
              <Text className="text-xs font-semibold text-white">
                Administrar
              </Text>
            </Pressable>
          </View>

          {/* Admin: gestión de guardias */}
          {esAdmin && (
            <View
              className="bg-white rounded-xl p-4 flex-row items-center justify-between"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
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
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-lg font-bold text-gray-900">
                Ingresos y salidas
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() =>
                    navigateToRoute(navigation, "Visitas")
                  }
                  className="px-3.5 py-1.5 rounded-full bg-primary"
                >
                  <Text className="text-xs font-semibold text-white">
                    Ver detalle
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigateToRoute(navigation, "VisitasNuevo")
                  }
                  className="px-3.5 py-1.5 rounded-full bg-secondary"
                >
                  <Text className="text-xs font-semibold text-white">
                    Registrar
                  </Text>
                </Pressable>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 500 }}>
                <View className="flex-row py-1.5 px-2 rounded-lg bg-gray-50">
                  {[
                    "Nombre",
                    "Tipo",
                    "Depto",
                    "Ingreso",
                    "Salida",
                    "Estado",
                  ].map((h) => (
                    <Text
                      key={h}
                      className="text-2xs font-semibold text-gray-400"
                      style={{
                        flex:
                          h === "Nombre"
                            ? 1.8
                            : h === "Tipo"
                              ? 1.2
                              : h === "Estado"
                                ? 0.9
                                : 0.7,
                        textAlign:
                          h === "Depto" ||
                          h === "Ingreso" ||
                          h === "Salida" ||
                          h === "Estado"
                            ? "center"
                            : "left",
                      }}
                    >
                      {h}
                    </Text>
                  ))}
                </View>
                {sourceData.map((item, idx) => (
                  <View
                    key={item.id}
                    className="flex-row py-1.5 px-2 items-center"
                    style={{
                      backgroundColor:
                        idx % 2 === 0 ? "transparent" : "#F9FAFB",
                    }}
                  >
                    <Text
                      className="text-xs font-medium text-gray-900"
                      numberOfLines={1}
                      style={{ flex: 1.8 }}
                    >
                      {item.nombre}
                    </Text>
                    <Text
                      className="text-xs text-gray-500"
                      numberOfLines={1}
                      style={{ flex: 1.2 }}
                    >
                      {item.tipo}
                    </Text>
                    <Text
                      className="text-xs text-gray-900 text-center"
                      style={{ flex: 0.7 }}
                    >
                      {item.depto}
                    </Text>
                    <Text
                      className="text-xs text-gray-900 text-center"
                      style={{ flex: 0.7 }}
                    >
                      {item.horaIngreso}
                    </Text>
                    <Text
                      className="text-xs text-gray-900 text-center"
                      style={{ flex: 0.7 }}
                    >
                      {item.horaSalida}
                    </Text>
                    <View
                      className="px-1.5 py-0.5 rounded-full"
                      style={{
                        flex: 0.9,
                        backgroundColor:
                          item.estado === "Ingresó"
                            ? "#DCFCE7"
                            : item.estado === "Finalizado"
                              ? "#F3F4F6"
                              : "#EFF6FF",
                      }}
                    >
                      <Text
                        className="text-2xs font-semibold"
                        style={{
                          color:
                            item.estado === "Ingresó"
                              ? "#16A34A"
                              : item.estado === "Finalizado"
                                ? "#9CA3AF"
                                : "#2563EB",
                        }}
                      >
                        {item.estado}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {/* Hoy — oculto para guardia y no-residentes */}
      {!esGuardia && esResidente && (
        <View
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <Text className="text-xl font-bold text-gray-900 mb-1">Hoy</Text>

          <Pressable
            className="flex-row items-center justify-between py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <Text className="text-base text-gray-900">
              Regalos por dar {regalosPorDar}
            </Text>
            <View
              className="items-center justify-center rounded-full overflow-hidden"
              style={{ width: 32, height: 32, backgroundColor: "#FEE2E2" }}
            >
              <Image
                source={iconRegalos}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
          </Pressable>

          {agendaHoy.map((item, i) => (
            <View
              key={item.id}
              className="flex-row items-center justify-between py-3.5"
              style={{
                borderBottomWidth: i === agendaHoy.length - 1 ? 0 : 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text className="text-base text-gray-900">{item.titulo}</Text>
              <Text className="text-sm text-gray-500">{item.hora}</Text>
            </View>
          ))}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
              marginTop: 4,
            }}
          >
            <MisReservas hideIfEmpty />
          </View>
        </View>
      )}

      {/* Bottom spacing for FABs */}
      <View style={{ height: 80 }} />

      {/* Popup detalle por hora — matching web */}
      <Modal
        visible={parkingOpen}
        onClose={() => setParkingOpen(false)}
        title="Estacionamientos de visita"
      >
        <View className="gap-3.5">
          <Text className="text-sm text-center text-gray-500">
            Asigne cada estacionamiento a un visitante registrado hoy
          </Text>
          <ScrollView
            className="max-h-[400px]"
            contentContainerClassName="gap-2"
          >
            {Array.from(
              { length: estacionamientos.total || 20 },
              (_, index) => {
                const spot = `B${String(index + 1).padStart(2, "0")}`;
                const assigned = parkingAssignments[spot] || "";
                return (
                  <View
                    key={spot}
                    className={`flex-row items-center gap-2 rounded-xl px-3 py-2 ${assigned ? "border border-green-500 bg-green-50" : "border border-gray-200 bg-gray-50"}`}
                  >
                    <Text className="min-w-[40px] text-sm font-bold text-gray-900">
                      {spot}
                    </Text>
                    <View className="flex-1">
                      <Select
                        value={assigned}
                        options={visitOptions}
                        placeholder="— Sin asignar —"
                        onChange={(value) =>
                          setParkingAssignments((current) => ({
                            ...current,
                            [spot]: String(value),
                          }))
                        }
                      />
                    </View>
                    {!!assigned && (
                      <Pressable
                        onPress={() =>
                          setParkingAssignments((current) => {
                            const next = { ...current };
                            delete next[spot];
                            return next;
                          })
                        }
                        className="p-1"
                      >
                        <Ionicons name="close" size={18} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                );
              },
            )}
          </ScrollView>
          <Button fullWidth onPress={saveParking}>
            Guardar asignaciones
          </Button>
        </View>
      </Modal>

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
