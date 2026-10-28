import { theme } from "@/config";
import React, { useLayoutEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores";
import { CampoTelefono, Input, Toggle } from "@/shared/components";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { useAlias } from "../hooks/useAlias";
import {
  ConfiguracionCampoBloqueado,
  EliminarCuenta,
} from "../components/configuracion";
import { AvisosEnEsteCelular, AvisosPorDonde } from "../components/perfil";
import { TurnoActual } from "../components/configuracion/TurnoActual";
import { PermisosDeLlamada } from "@/features/intercom/components/PermisosDeLlamada";
import { usePermisosDeLlamada } from "@/features/intercom/hooks/usePermisosDeLlamada";
import { useNavegacion, useParametrosDeLaBase } from "@/shared/hooks";

export function ConfiguracionScreen() {
  const navigation = useNavegacion();
  const { usuario, rolActivo } = useAuthStore();
  const aliasForm = useAlias();
  const { preferencias, escribir, cambiar, cambiarContactoAlt, guardarCampo } =
    useConfiguracion();
  // El detalle aviso por aviso está oculto salvo que la plataforma lo encienda.
  const parametros = useParametrosDeLaBase();
  // En Android con el APK 6: lo que le falta al celular para que suenen.
  const { permisos: permisosDeLlamada } = usePermisosDeLlamada();
  const avisosPorMotivo = parametros.listo && parametros.booleano("avisos_por_motivo");

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

  const usarAltNotif = preferencias.usarContactoAlt;

  return (
    <View className="flex-1 bg-gray-50">
      <DesplazableConTeclado className="flex-1" contentContainerClassName="p-4 gap-4">
        {esGuardia && <TurnoActual />}

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
            Información personal
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
                  // Se guarda al salir del número, como las demás cajas.
                  onTelefonoBlur={() => guardarCampo("telefono")}
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
                  {/*
                    Prometía que los avisos irían aquí, y ningún aviso lo
                    usaba. Decidido el 26/10/2026 (hueco 20): es otra forma de
                    localizarte que ven la portería y la administración en el
                    directorio de propiedades.
                  */}
                  Si quieres, deja otro teléfono o correo donde localizarte. La
                  portería y la administración lo verán en el directorio de tu
                  vivienda. Tus avisos siguen llegando a los datos de arriba.
                </Text>
              </View>

              <View className="flex-row justify-between items-center mt-4">
                <Text className="flex-1 text-sm font-medium text-gray-900">
                  ¿Dejar un contacto alternativo?
                </Text>
                <Toggle
                  value={usarAltNotif}
                  onChange={cambiarContactoAlt}
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
                  <CampoTelefono
                    label="Teléfono alternativo"
                    codigoPais={preferencias.codigoPaisAlt}
                    onCodigoPaisChange={(codigo) => {
                      escribir({ codigoPaisAlt: codigo });
                      guardarCampo("codigoPaisAlt", codigo);
                    }}
                    telefono={preferencias.telefonoAlt}
                    onTelefonoChange={(v) => escribir({ telefonoAlt: v })}
                    onTelefonoBlur={() => guardarCampo("telefonoAlt")}
                  />
                  <Input
                    label="Correo alternativo"
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
          Notificaciones push (22/10/2026): un interruptor general, encendido
          por defecto, y debajo si este celular puede recibirlas y la prueba de
          que llegan. El cliente pidió «desactivar o activar en general, no uno
          por uno»; los avisos no salen por correo ni por WhatsApp.
        */}
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            backgroundColor: theme.colors.bgCard,
            boxShadow: theme.shadows.card,
          }}
        >
          <Text className="text-base font-bold text-gray-900">
            Notificaciones push
          </Text>
          <View className="flex-row justify-between items-center gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-medium text-gray-900">
                Recibir notificaciones en el celular
              </Text>
              <Text className="text-xs leading-5 text-gray-500">
                En todos los celulares donde tengas la sesión abierta. La
                alarma de S.O.S. llega siempre.
              </Text>
            </View>
            <Toggle
              value={preferencias.avisosPush}
              onChange={(v) => cambiar({ avisosPush: v })}
              accessibilityLabel="Recibir notificaciones en el celular"
            />
          </View>
          {preferencias.avisosPush ? <AvisosEnEsteCelular /> : null}
        </View>

        {/*
          Llamadas por la app (28/10/2026): cada uno elige si le pueden sonar.
          Apagado, quien quiera hablar con él lo llama por teléfono; la
          pantalla «Llamar» ya no le ofrece la app.
        */}
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            backgroundColor: theme.colors.bgCard,
            boxShadow: theme.shadows.card,
          }}
        >
          <Text className="text-base font-bold text-gray-900">Llamadas</Text>
          <View className="flex-row justify-between items-center gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-medium text-gray-900">
                Recibir llamadas por la app
              </Text>
              <Text className="text-xs leading-5 text-gray-500">
                {preferencias.recibeLlamadasApp
                  ? "Te pueden llamar por internet desde la app. También por teléfono, si tu número es visible."
                  : "Nadie te puede llamar por la app: solo por teléfono, si tu número es visible."}
              </Text>
            </View>
            <Toggle
              value={preferencias.recibeLlamadasApp}
              onChange={(v) => cambiar({ recibeLlamadasApp: v })}
              accessibilityLabel="Recibir llamadas por la app"
            />
          </View>
          {preferencias.recibeLlamadasApp && permisosDeLlamada ? (
            <PermisosDeLlamada permisos={permisosDeLlamada} />
          ) : null}
        </View>

        {/*
          Por donde avisar de cada cosa (pedido del 02/10/2026). Oculto desde
          el 22/10/2026: el cliente prefirió un interruptor general. No se
          borró por si se vuelve a querer; lo enciende el parámetro
          `avisos_por_motivo`.
        */}
        {avisosPorMotivo ? (
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
        ) : null}

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
          {/*
            «Pausar cuenta» se retira (13/10/2026, decidido con el cliente):
            encendía un interruptor para decir que no estaba disponible.
          */}
          <EliminarCuenta />
        </View>

        <View className="h-2" />
      </DesplazableConTeclado>
    </View>
  );
}
