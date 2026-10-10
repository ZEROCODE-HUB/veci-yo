import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button, Input, Toggle } from "@/shared/components";
import { TRA_ENVIO_ACTIVO, type EstadoTra } from "../services/suscripcion.repo";

interface Props {
  estado: EstadoTra;
  onGuardarToken: (token: string) => void;
  guardando: boolean;
  onArmar: (armado: boolean) => void;
  armando: boolean;
}

/**
 * La conexión del anfitrión con la TRA del MinCIT.
 *
 * ## Por qué vive aquí y no en una pantalla aparte
 *
 * Reportar a la TRA es un acto **del anfitrión sobre su vivienda**: es su RNT
 * el que queda declarado y es él quien responde ante el ministerio —lo dice
 * `datos_para_la_tra`, que por eso pregunta por la vivienda y no por el
 * edificio—. Así que va en la configuración de su renta corta, en la misma
 * tarjeta donde ya estaba el RNT, que es el otro dato del mismo trámite.
 *
 * ## Por qué son dos cosas y no un formulario
 *
 * El token y el permiso de disparar están separados **a propósito** desde el
 * 06/10/2026: tener la credencial no es querer usarla. Un reporte a la TRA es
 * una declaración legal ante el Estado que no se deshace por API, y en esta
 * base hay pruebas que crean huéspedes inventados. Si guardar el token armara
 * el reporte, el día que se guardara uno de verdad la suite habría presentado
 * declaraciones reales.
 *
 * Por eso el interruptor es un acto aparte, y por eso dice en voz alta lo que
 * pasa al encenderlo: la pantalla que esconde eso es la que mete a alguien en
 * un lío con el ministerio.
 *
 * ## Lo que no se enseña
 *
 * El token, nunca: ni entero ni recortado. Vive cifrado en el Vault y lo único
 * que vuelve de la base es si lo hay. Para cambiarlo se escribe uno nuevo.
 */
export function ConexionTra({
  estado,
  onGuardarToken,
  guardando,
  onArmar,
  armando,
}: Props) {
  const [token, setToken] = useState("");
  const [cambiando, setCambiando] = useState(false);

  const guardar = () => {
    onGuardarToken(token);
    setToken("");
    setCambiando(false);
  };

  return (
    <View className="gap-3 mt-5 pt-4 border-t border-gray-200">
      <View className="flex-row items-center gap-2">
        <Text
          className="text-sm font-medium flex-1"
          style={{ color: theme.colors.textSecondary }}
        >
          Reporte de huéspedes a la TRA (MinCIT)
        </Text>
        {/*
          La etiqueta dice el estado **de verdad**, y mientras Veciyo esté en
          simulación ese es el estado para todos: poner «APAGADO» o «SIN
          CONFIGURAR» daría a entender que configurándolo se encendería.
        */}
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor: !TRA_ENVIO_ACTIVO
              ? theme.colors.secondaryLight
              : estado.armado
                ? theme.colors.successLight
                : theme.colors.borderLight,
          }}
        >
          <Text
            className="text-2xs font-bold"
            style={{
              color: !TRA_ENVIO_ACTIVO
                ? theme.colors.secondary
                : estado.armado
                  ? theme.colors.success
                  : theme.colors.textSecondary,
            }}
          >
            {!TRA_ENVIO_ACTIVO
              ? "SIMULACIÓN"
              : estado.armado
                ? "ACTIVO"
                : estado.tieneToken
                  ? "APAGADO"
                  : "SIN CONFIGURAR"}
          </Text>
        </View>
      </View>

      {/* El token */}
      {estado.tieneToken && !cambiando ? (
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="lock-closed"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text className="text-xs text-gray-500 flex-1">
            Token guardado y cifrado. Por seguridad no se puede ver.
          </Text>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setCambiando(true)}
          >
            Cambiar
          </Button>
        </View>
      ) : (
        <View className="gap-2">
          {/*
            `type="password"` lo oculta y le pone el ojo para mirarlo: un token
            se pega y se comprueba una vez, y sin poder verlo un caracter de
            mas no se detecta hasta que el ministerio rechaza el reporte.
          */}
          <Input
            label="Token de la TRA"
            value={token}
            onChangeText={setToken}
            placeholder="Pegá aquí el token que te dio el MinCIT"
            type="password"
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                fullWidth
                onPress={guardar}
                disabled={!token.trim() || guardando}
              >
                {guardando ? "Guardando…" : "Guardar token"}
              </Button>
            </View>
            {cambiando && (
              <Button
                variant="secondary"
                onPress={() => {
                  setToken("");
                  setCambiando(false);
                }}
              >
                Cancelar
              </Button>
            )}
          </View>
        </View>
      )}

      {/*
        Mientras Veciyo entero está en simulación no se ofrece el interruptor:
        encenderlo no haría nada, y un control que no puede cumplir lo que
        promete es el defecto más repetido de este proyecto. Lo que se enseña
        en su lugar es por qué.
      */}
      {TRA_ENVIO_ACTIVO ? (
        <View
          className="rounded-xl p-3 gap-2"
          style={{
            backgroundColor: estado.armado
              ? theme.colors.warningLight
              : theme.colors.bgMuted,
            borderWidth: 1,
            borderColor: estado.armado
              ? theme.colors.warning
              : theme.colors.border,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-medium text-gray-900 flex-1">
              Enviar los reportes de verdad
            </Text>
            <Toggle
              value={estado.armado}
              onChange={onArmar}
              disabled={!estado.tieneToken || armando}
            />
          </View>
          <Text
            className="text-xs leading-5"
            style={{ color: theme.colors.textSecondary }}
          >
            {!estado.tieneToken
              ? "Primero guardá el token. Sin él no hay nada que enviar."
              : estado.armado
                ? "Cada huésped que registres se declara ante el MinCIT con tu RNT. Una declaración enviada no se deshace desde la aplicación."
                : "Mientras esté apagado podés usar todo lo demás y nada sale al ministerio. Encendelo cuando vayas a reportar huéspedes reales."}
          </Text>
        </View>
      ) : (
        <View
          className="rounded-xl p-3 gap-1.5"
          style={{
            backgroundColor: theme.colors.secondaryLight,
            borderWidth: 1,
            borderColor: theme.colors.secondary,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="flask"
              size={16}
              color={theme.colors.secondary}
            />
            <Text className="text-sm font-semibold text-gray-900">
              Modo simulación
            </Text>
          </View>
          <Text
            className="text-xs leading-5"
            style={{ color: theme.colors.textSecondary }}
          >
            Por ahora <Text className="font-semibold">no se envía nada al
            ministerio</Text>, ni desde esta vivienda ni desde ninguna. Podés
            guardar tu token y registrar huéspedes con normalidad: cada reporte
            se arma entero y queda guardado para que lo revises, sin salir.
          </Text>
        </View>
      )}

      {/*
        El último fallo, si lo hubo. Una integración deja de funcionar **en
        silencio** —el token sigue ahí, la pantalla sigue igual, y los reportes
        dejan de salir—, que es lo mismo que ya pasó con el calendario.
      */}
      {estado.error ? (
        <View
          className="rounded-xl p-3 flex-row gap-2"
          style={{ backgroundColor: theme.colors.dangerLight }}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={theme.colors.danger}
          />
          <Text
            className="text-xs flex-1 leading-5"
            style={{ color: theme.colors.danger }}
          >
            El último reporte falló: {estado.error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
