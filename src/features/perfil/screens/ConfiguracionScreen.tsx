import { theme } from "@/config";
import React, { useState, useLayoutEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, useUIStore } from "@/stores";
import { Button, CampoTelefono, Input, Toggle, Modal } from "@/shared/components";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { useAlias } from "../hooks/useAlias";
import { ConfiguracionCampoBloqueado } from "../components/configuracion";
import { AvisosPorDonde } from "../components/perfil";
import { useNavegacion } from "@/shared/hooks";

const RAZONES_ELIMINAR = [
  "Ya no resido en este condominio",
  "Cambio de condominio",
  "No uso la aplicación",
  "Problemas con la app",
  "Otro",
];

export function ConfiguracionScreen() {
  const navigation = useNavegacion();
  const { usuario, rolActivo, turnoTerminado, terminarTurno } = useAuthStore();
  const aliasForm = useAlias();
  const { preferencias, escribir, cambiar, guardarCampo } = useConfiguracion();
  const { addToast } = useUIStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-1 mr-4"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
      ),
    });
  }, [navigation]);

  /*
    Decia `usuario?.nombre || "Guillermo"`, `|| "Coradir"` y un documento fijo,
    "1632278423", que se mostraba a **cualquiera** que abriera Configuracion
    bajo la etiqueta "Documento". Es el mismo defecto que los contactos de
    emergencia escritos a mano (R-47) y la invitacion de "Carlos Balazo".
  */
  const nombre = usuario?.nombre ?? "";
  const apellido = usuario?.apellido ?? "";
  const documento = usuario?.identificacion ?? "";
  const esGuardia = rolActivo === "guardia";

  const [showPausar, setShowPausar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [pausaActiva, setPausaActiva] = useState(false);
  const [razonEliminar, setRazonEliminar] = useState(RAZONES_ELIMINAR[0]);
  const [otraRazon, setOtraRazon] = useState("");

  const usarAltNotif = preferencias.usarContactoAlt;

  /*
    Pausar la cuenta ponia una bandera en memoria y anunciaba "Ahora estas
    invisible y no recibiras notificaciones" —no lo estabas—, y eliminarla
    respondia literalmente "Cuenta eliminada (demo)". Las dos son operaciones
    sobre `auth.users` que necesitan decision de producto y de legal: que pasa
    con las membresias, con las PQRS abiertas y con lo que la persona firmo.
    Mientras tanto se dice lo que hay.
  */
  const confirmarPausar = () => {
    setShowPausar(false);
    addToast(
      "Pausar la cuenta todavía no está disponible. Escribinos desde Soporte.",
      "info",
    );
  };

  const confirmarEliminar = () => {
    setShowEliminar(false);
    addToast(
      "Eliminar la cuenta todavía no está disponible. Escribinos desde Soporte.",
      "info",
    );
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
              shadowColor: theme.colors.shadow,
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
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Text className="text-sm text-gray-500">Estado</Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.colors.success }}
                  >
                    En turno activo
                  </Text>
                </View>
                <View
                  className="flex-row justify-between items-center py-2.5"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.borderLight,
                  }}
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
            shadowColor: theme.colors.shadow,
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
            shadowColor: theme.colors.shadow,
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
                value={usuario?.correo ?? ""}
              />
              <ConfiguracionCampoBloqueado
                label="Teléfono"
                value={preferencias.telefono}
                isLast
              />
            </>
          ) : (
            <>
              {/*
                Eran dos `Input` sueltos: «Código del País» a mano, donde cabía
                «+57», «57» o «Colombia», y el número al lado. De ahí venían las
                tres grafías conviviendo en la misma columna.

                Ahora el país se elige de una lista y se guarda en ISO —«CO»—,
                que es lo que la base exige desde el 03/10/2026 y lo que permite
                componer el número para llamar o para WhatsApp.
              */}
              <View className="mb-3">
                <CampoTelefono
                  label="Teléfono"
                  codigoPais={preferencias.codigoPais}
                  onCodigoPaisChange={(codigo) => {
                    escribir({ codigoPais: codigo });
                    // Se elige de una lista, así que no hay un «terminé de
                    // escribir»: se guarda al elegir.
                    guardarCampo("codigoPais", codigo);
                  }}
                  telefono={preferencias.telefono}
                  onTelefonoChange={(v) => escribir({ telefono: v })}
                  placeholder="300 123 4567"
                />
              </View>
              {/* El correo es la identidad (regla 3) y se cambia desde la
                  cuenta, no desde aqui: editarlo en esta caja no lo cambiaba
                  en ningun sitio. */}
              <ConfiguracionCampoBloqueado
                label="Correo electrónico"
                value={usuario?.correo ?? ""}
              />
              {/* Es el mismo alias del Perfil, no otro: habia dos campos con
                  dos valores por defecto distintos para el mismo dato. */}
              <Input
                label="Alias"
                value={aliasForm.alias}
                onChangeText={aliasForm.setAlias}
                onBlur={aliasForm.guardar}
              />

              <View
                className="flex-row gap-2.5 mt-3.5 p-3 rounded-xl"
                style={{ backgroundColor: theme.colors.secondaryLight }}
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
                  onChange={(v) => cambiar({ usarContactoAlt: v })}
                />
              </View>

              {usarAltNotif && (
                <View
                  className="gap-3 mt-3 pt-3"
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.borderLight,
                  }}
                >
                  <Input
                    label="Número alternativo (notificaciones)"
                    value={preferencias.telefonoAlt}
                    onChangeText={(v) => escribir({ telefonoAlt: v })}
                    onBlur={() => guardarCampo("telefonoAlt")}
                    placeholder="Opcional"
                  />
                  <Input
                    label="Correo alternativo (notificaciones)"
                    value={preferencias.correoAlt}
                    onChangeText={(v) => escribir({ correoAlt: v })}
                    onBlur={() => guardarCampo("correoAlt")}
                    placeholder="Opcional"
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/*
          Por donde avisar de cada cosa. Lo pidio el cliente el 02/10/2026
          --«WhatsApp configurable por residente y por tipo de aviso»-- y va
          aqui, junto a los datos de contacto, porque es lo mismo visto por el
          otro lado: arriba se dice **a donde** y aqui **de que** y **por
          donde**.
        */}
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            backgroundColor: theme.colors.bgCard,
            boxShadow: theme.shadows.card,
          }}
        >
          <Text className="text-base font-bold text-gray-900">
            Avisos: de qué y por dónde
          </Text>
          <AvisosPorDonde />
        </View>

        {/*
          Aqui habia un bloque «Configuracion de App» con tres interruptores
          --modo daltonico, fuente aumentada y modo oscuro--. Se guardaban en el
          perfil y **no cambiaban nada en pantalla**: aplicarlos es trabajo del
          sistema de diseño, no de esta pantalla, y nadie lo habia hecho. El
          propio bloque lo decia debajo del titulo: «Todavia no cambia el
          aspecto de la aplicacion».

          Retirado a peticion del cliente el 01/10/2026. Un interruptor que
          anuncia que no hace nada es ruido en una pantalla que ya tiene mucho
          que leer; el dia que el sistema de diseño sepa pintarlos, vuelven.

          Las tres columnas de `perfil` se quedan: borrar datos del cliente no
          se hace para limpiar una pantalla, y lo guardado hasta hoy sigue ahi.
        */}

        {/*
          Aqui habia un segundo bloque "Contacto Alternativo" solo para el
          administrador, con los mismos dos campos que el de arriba y contra el
          mismo dato. Uno de los dos sobraba.
        */}

        {/*
          Y un bloque "Contacto de Emergencia" cuyos tres campos eran
          `value={""}` y `onChangeText={() => {}}`: se escribia y no pasaba
          nada, ni en memoria. Nadie ha definido que es ese contacto a nivel
          condominio —los de la vivienda si existen, en `contacto_emergencia`—
          asi que se retira en vez de dejar un formulario que no escribe.
        */}

        {/* Cuenta */}
        <View
          className="bg-white rounded-xl p-4"
          style={{
            shadowColor: theme.colors.shadow,
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
              accessibilityRole="radio"
              accessibilityState={{ checked: razonEliminar === r }}
              aria-checked={razonEliminar === r}
              className="p-3 rounded-xl"
              style={{
                borderWidth: 1.5,
                borderColor:
                  razonEliminar === r
                    ? theme.colors.primary
                    : theme.colors.border,
                backgroundColor:
                  razonEliminar === r
                    ? theme.colors.secondaryLight
                    : theme.colors.bgCard,
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
