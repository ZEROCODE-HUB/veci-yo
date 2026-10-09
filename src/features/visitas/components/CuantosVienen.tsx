import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button, Contador } from "@/shared/components";

interface Props {
  /** Cuantas personas dijo el anfitrion que vienen, contando al titular. */
  previstas?: number;
  /** Cuantas de ellas son menores. */
  menores?: number;
  /** Cuantas fichas existen ya. */
  registradas: number;
  /** Si el preregistro ya se cerro: entonces no se toca. */
  cerrado: boolean;
  onGuardar: (previstas: number, menores: number) => void;
  guardando: boolean;
}

/**
 * Cuántas personas vienen, y poder cambiarlo.
 *
 * El número se guarda desde el 09/10/2026 y hasta hoy **no se podía
 * corregir**: se elegía al reservar y ahí se quedaba. Eso importa porque desde
 * la misma fecha el preregistro **no se cierra** con menos gente de la que
 * dice la reserva, así que una reserva para cuatro a la que al final vienen
 * dos dejaba al huésped sin poder terminar y sin nada que hacer desde donde
 * está.
 *
 * Lo decidió así el cliente, frente a dejar que lo bajara el huésped: *«si
 * vienen menos gente pues el anfitrión edita el número y en el mismo enlace se
 * actualiza»*. Es lo correcto —el huésped no debería poder cambiar lo que otro
 * reservó— y además deja constancia de quién lo cambió.
 *
 * Cerrado no se toca: lo declarado ya pasó, y en una estancia reportada a la
 * autoridad cambiarlo sería contradecir una declaración.
 */
export function CuantosVienen({
  previstas,
  menores = 0,
  registradas,
  cerrado,
  onGuardar,
  guardando,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [cuantas, setCuantas] = useState(previstas ?? registradas);
  const [cuantosMenores, setCuantosMenores] = useState(menores);

  // Sin número declarado no hay nada que corregir: es lo que pasa con las
  // reservas de antes y con las que entran por el calendario de Airbnb.
  const faltan = previstas ? Math.max(0, previstas - registradas) : 0;

  if (cerrado) {
    return (
      <View
        className="rounded-2xl p-4"
        style={{ backgroundColor: theme.colors.bgMuted }}
      >
        <Text className="text-sm text-gray-600">
          {registradas} {registradas === 1 ? "persona" : "personas"} ·
          preregistro cerrado
        </Text>
      </View>
    );
  }

  if (!editando) {
    return (
      <View
        className="rounded-2xl p-4 gap-1"
        /*
          Sin ambar. Que falte gente recien reservado **es lo normal**: las
          demas personas se registran desde el enlace, no las pone el
          anfitrion. Pintarlo como un aviso hace que parezca que algo salio
          mal justo despues de crear la reserva, y eso fue lo primero que
          pregunto el cliente el 09/10/2026: «¿por que dice 1 de 2? no
          entiendo».
        */
        style={{
          backgroundColor: theme.colors.bgMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-gray-900 flex-1">
            {previstas
              ? `${registradas} de ${previstas} personas`
              : `${registradas} ${registradas === 1 ? "persona" : "personas"}`}
            {menores > 0 ? ` · ${menores} menor${menores === 1 ? "" : "es"}` : ""}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar cuántas personas vienen"
            onPress={() => setEditando(true)}
            className="flex-row items-center gap-1 py-1 px-2"
          >
            <Ionicons name="pencil" size={13} color={theme.colors.secondary} />
            <Text
              className="text-xs font-semibold"
              style={{ color: theme.colors.secondary }}
            >
              Cambiar
            </Text>
          </Pressable>
        </View>
        {faltan > 0 ? (
          <Text className="text-xs leading-5 text-gray-600">
            {`${faltan === 1 ? "La otra persona se registra" : `Las otras ${faltan} se registran`} desde el enlace del huésped, no hace falta que las cargues vos. Hasta que estén todas no puede terminar su preregistro; si al final vienen menos, cambiá el número acá.`}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl p-4 gap-3"
      style={{
        backgroundColor: theme.colors.bgMuted,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Contador
        emoji="👥"
        label="Personas"
        ayuda="Incluye al titular de la reserva."
        valor={cuantas}
        /*
          No por debajo de las que ya estan registradas: bajarlo no borra a
          nadie, y dejaria una reserva para dos con tres personas dentro.
        */
        minimo={Math.max(1, registradas)}
        onCambiar={(v) => {
          setCuantas(v);
          if (cuantosMenores > v - 1) setCuantosMenores(Math.max(0, v - 1));
        }}
      />
      <View style={{ height: 1, backgroundColor: theme.colors.borderLight }} />
      <Contador
        emoji="👶"
        label="Menores"
        ayuda="De las personas de arriba, cuántas son menores de edad."
        valor={cuantosMenores}
        maximo={Math.max(0, cuantas - 1)}
        onCambiar={setCuantosMenores}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            fullWidth
            disabled={guardando}
            onPress={() => {
              onGuardar(cuantas, cuantosMenores);
              setEditando(false);
            }}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </View>
        <Button
          variant="secondary"
          onPress={() => {
            setCuantas(previstas ?? registradas);
            setCuantosMenores(menores);
            setEditando(false);
          }}
        >
          Cancelar
        </Button>
      </View>
    </View>
  );
}
