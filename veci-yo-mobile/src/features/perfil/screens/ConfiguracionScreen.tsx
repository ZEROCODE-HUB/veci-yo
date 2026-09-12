import React, { useState, useLayoutEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, useUIStore } from "@/stores";
import { Button, Input, Toggle, Modal } from "@/shared/components";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { ConfiguracionCampoBloqueado } from "../components/configuracion";

const TOGGLES = [
  { key: "modoDaltonico", label: "Modo daltónico" },
  { key: "fuenteAumentada", label: "Fuente aumentada" },
  { key: "modoOscuro", label: "Modo Oscuro" },
];

const RAZONES_ELIMINAR = [
  "Ya no resido en este condominio",
  "Cambio de condominio",
  "No uso la aplicación",
  "Problemas con la app",
  "Otro",
];

export function ConfiguracionScreen() {
  const navigation = useNavigation<any>();
  const { usuario, rolActivo, turnoTerminado, terminarTurno } = useAuthStore();
  const { configuracionApp, actualizarConfiguracionApp, pausarCuenta } =
    useConfiguracion();
  const { addToast } = useUIStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-1 mr-4"
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const nombre = usuario?.nombre || "Guillermo";
  const apellido = usuario?.apellido || "Coradir";
  const documento = "1632278423";
  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";

  const [showPausar, setShowPausar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [pausaActiva, setPausaActiva] = useState(false);
  const [razonEliminar, setRazonEliminar] = useState(RAZONES_ELIMINAR[0]);
  const [otraRazon, setOtraRazon] = useState("");

  const usarAltNotif = configuracionApp.usarAltNotif;

  const confirmarPausar = () => {
    pausarCuenta();
    setPausaActiva(true);
    setShowPausar(false);
    addToast(
      "Cuenta pausada. Ahora estás invisible y no recibirás notificaciones.",
      "success",
    );
  };

  const confirmarEliminar = () => {
    setShowEliminar(false);
    const razon =
      razonEliminar === "Otro" ? otraRazon.trim() || "Otro" : razonEliminar;
    addToast(`Cuenta eliminada (demo). Razón: ${razon}`, "success");
  };

  const handleTerminarTurno = () => {
    terminarTurno();
    addToast(
      "Turno finalizado. Tus privilegios de seguridad se han deshabilitado.",
      "success",
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        {/* Turno actual — solo para guardia */}
        {esGuardia && (
          <View
            className="bg-white rounded-xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-base font-bold text-gray-900 text-center mb-3.5">
              Turno Actual
            </Text>
            {turnoTerminado ? (
              <View className="gap-2">
                <View className="flex-row justify-between items-center py-2.5">
                  <Text className="text-sm text-gray-500">Estado</Text>
                  <Text className="text-sm text-gray-400 font-medium">
                    Turno finalizado
                  </Text>
                </View>
              </View>
            ) : (
              <View className="gap-2">
                <View
                  className="flex-row justify-between items-center py-2.5"
                  style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                >
                  <Text className="text-sm text-gray-500">Estado</Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: "#16A34A" }}
                  >
                    En turno activo
                  </Text>
                </View>
                <View
                  className="flex-row justify-between items-center py-2.5"
                  style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                >
                  <Text className="text-sm text-gray-500">Garita</Text>
                  <Text className="text-sm text-gray-900">Principal</Text>
                </View>
                <View className="mt-3">
                  <Button variant="danger" onPress={handleTerminarTurno}>
                    Terminar Turno
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Información Personal — solo lectura */}
        <View
          className="bg-white rounded-xl p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-base font-bold text-gray-900 text-center mb-1">
            Informacion Personal
          </Text>
          <ConfiguracionCampoBloqueado label="Nombre" value={nombre} />
          <ConfiguracionCampoBloqueado label="Apellido" value={apellido} />
          <ConfiguracionCampoBloqueado
            label="Documento"
            value={documento}
            isLast
          />
        </View>

        {/* Información Contacto */}
        <View
          className="bg-white rounded-xl p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-base font-bold text-gray-900 text-center mb-3.5">
            Información Contacto
          </Text>
          {esGuardia ? (
            <>
              <ConfiguracionCampoBloqueado
                label="Correo"
                value={usuario?.correo || configuracionApp.correo || ""}
              />
              <ConfiguracionCampoBloqueado
                label="Teléfono"
                value={configuracionApp.telefono || ""}
                isLast
              />
            </>
          ) : (
            <>
              <View className="flex-row gap-2.5 mb-3">
                <View className="flex-1">
                  <Input
                    label="Código del País"
                    value={configuracionApp.codigoPais}
                    onChangeText={(v) =>
                      actualizarConfiguracionApp({ codigoPais: v })
                    }
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Numero de Telefono"
                    value={configuracionApp.telefono}
                    onChangeText={(v) =>
                      actualizarConfiguracionApp({ telefono: v })
                    }
                  />
                </View>
              </View>
              <Input
                label="Correo electrónico"
                value={usuario?.correo || configuracionApp.correo}
                onChangeText={(v) => actualizarConfiguracionApp({ correo: v })}
              />
              <Input
                label="Alias"
                value={configuracionApp.alias}
                onChangeText={(v) => actualizarConfiguracionApp({ alias: v })}
              />

              <View
                className="flex-row gap-2.5 mt-3.5 p-3 rounded-xl"
                style={{ backgroundColor: "#EFF6FF" }}
              >
                <Text style={{ fontSize: 18 }}>📩</Text>
                <Text
                  className="flex-1 text-xs text-gray-900"
                  style={{ lineHeight: 18 }}
                >
                  Las notificaciones de la aplicación se enviarán al número de
                  teléfono y al correo registrados arriba. Si lo prefieres,
                  puedes indicar datos alternativos para recibirlas.
                </Text>
              </View>

              <View className="flex-row justify-between items-center mt-4">
                <Text className="flex-1 text-sm font-medium text-gray-900">
                  ¿Recibir notificaciones en datos alternativos?
                </Text>
                <Toggle
                  value={usarAltNotif}
                  onChange={(v) =>
                    actualizarConfiguracionApp({ usarAltNotif: v })
                  }
                />
              </View>

              {usarAltNotif && (
                <View
                  className="gap-3 mt-3 pt-3"
                  style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
                >
                  <Input
                    label="Número alternativo (notificaciones)"
                    value={configuracionApp.telefonoAlt}
                    onChangeText={(v) =>
                      actualizarConfiguracionApp({ telefonoAlt: v })
                    }
                    placeholder="Opcional"
                  />
                  <Input
                    label="Correo alternativo (notificaciones)"
                    value={configuracionApp.correoAlt}
                    onChangeText={(v) =>
                      actualizarConfiguracionApp({ correoAlt: v })
                    }
                    placeholder="Opcional"
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Configuración de App — oculta para guardia */}
        {!esGuardia && (
          <View
            className="bg-white rounded-xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-base font-bold text-gray-900 text-center mb-1">
              Configuración de App
            </Text>
            {TOGGLES.map((t, i) => (
              <View
                key={t.key}
                className="flex-row items-center justify-between py-3.5"
                style={{
                  borderBottomWidth: i === TOGGLES.length - 1 ? 0 : 1,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <Text className="text-base text-gray-900">{t.label}</Text>
                <Toggle
                  value={(configuracionApp as any)[t.key]}
                  onChange={(v) => actualizarConfiguracionApp({ [t.key]: v })}
                />
              </View>
            ))}
          </View>
        )}

        {/* Contacto Alternativo — solo administrador */}
        {esAdmin && (
          <View
            className="bg-white rounded-xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-base font-bold text-gray-900 text-center mb-3.5">
              Contacto Alternativo
            </Text>
            <Text
              className="text-xs text-gray-500 text-center mb-3"
              style={{ lineHeight: 18 }}
            >
              Datos de contacto alternativos para recibir notificaciones.
            </Text>
            <Input
              label="Correo alternativo"
              value={configuracionApp.correoAlt || ""}
              onChangeText={(v) => actualizarConfiguracionApp({ correoAlt: v })}
              placeholder="correo@ejemplo.com"
            />
            <Input
              label="Teléfono alternativo"
              value={configuracionApp.telefonoAlt || ""}
              onChangeText={(v) =>
                actualizarConfiguracionApp({ telefonoAlt: v })
              }
              placeholder="+593 999999999"
            />
          </View>
        )}

        {/* Contacto de Emergencia — solo administrador */}
        {esAdmin && (
          <View
            className="bg-white rounded-xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-base font-bold text-gray-900 text-center mb-3.5">
              Contacto de Emergencia
            </Text>
            <Text
              className="text-xs text-gray-500 text-center mb-3"
              style={{ lineHeight: 18 }}
            >
              Persona de contacto en caso de emergencia.
            </Text>
            <Input
              label="Nombre del contacto"
              value={""}
              onChangeText={() => {}}
              placeholder="Nombre completo"
            />
            <Input
              label="Correo de emergencia"
              value={""}
              onChangeText={() => {}}
              placeholder="correo@ejemplo.com"
            />
            <Input
              label="Teléfono de emergencia"
              value={""}
              onChangeText={() => {}}
              placeholder="+593 999999999"
            />
          </View>
        )}

        {/* Cuenta */}
        <View
          className="bg-white rounded-xl p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-base font-bold text-gray-900 text-center mb-3.5">
            Cuenta
          </Text>
          {!esGuardia && (
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-medium text-gray-900">
                Pausar cuenta
              </Text>
              <Toggle
                value={pausaActiva}
                onChange={(v) => {
                  if (v) setShowPausar(true);
                  else setPausaActiva(false);
                }}
              />
            </View>
          )}
          <Button variant="danger" onPress={() => setShowEliminar(true)}>
            Eliminar cuenta
          </Button>
        </View>

        <View className="h-2" />
      </ScrollView>

      {/* Pausar cuenta */}
      <Modal
        visible={showPausar}
        onClose={() => setShowPausar(false)}
        title="Pausar cuenta"
      >
        <View className="gap-4 items-center py-2">
          <Text style={{ fontSize: 48 }}>⏸️</Text>
          <Text
            className="text-sm text-gray-900 text-center"
            style={{ lineHeight: 22 }}
          >
            Al pausar la cuenta te invisibilizas en todo lugar de la aplicación,
            pero tampoco recibirás notificaciones.
          </Text>
          <Button variant="primary" onPress={confirmarPausar}>
            Pausar cuenta
          </Button>
          <Button variant="ghost" onPress={() => setShowPausar(false)}>
            Cancelar
          </Button>
        </View>
      </Modal>

      {/* Eliminar cuenta */}
      <Modal
        visible={showEliminar}
        onClose={() => setShowEliminar(false)}
        title="Eliminar cuenta"
      >
        <View className="gap-3.5">
          <Text className="text-sm text-gray-900 text-center">
            ¿Es porque ya no resides en este condominio o cuál es la razón?
          </Text>
          {RAZONES_ELIMINAR.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRazonEliminar(r)}
              className="p-3 rounded-xl"
              style={{
                borderWidth: 1.5,
                borderColor: razonEliminar === r ? "#F5B800" : "#E5E7EB",
                backgroundColor: razonEliminar === r ? "#EFF6FF" : "#fff",
              }}
            >
              <Text className="text-sm font-medium text-gray-900">{r}</Text>
            </Pressable>
          ))}
          {razonEliminar === "Otro" && (
            <Input
              label="Cuéntanos la razón"
              value={otraRazon}
              onChangeText={setOtraRazon}
              placeholder="Escribe tu razón"
              multiline
            />
          )}
          <Button variant="danger" onPress={confirmarEliminar}>
            Eliminar cuenta
          </Button>
          <Button variant="ghost" onPress={() => setShowEliminar(false)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
