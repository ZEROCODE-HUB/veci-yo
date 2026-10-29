import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Checkbox, Contador, Select } from "@/shared/components";
import type { useParametrosDeLaBase } from "@/shared/hooks";
import type { AltaDeVisita } from "./tipos";

/** La vivienda y cuántas personas vienen, con los menores. */
export function CantidadDeInvitados({
  alta: v,
  parametros,
}: {
  alta: AltaDeVisita;
  parametros: ReturnType<typeof useParametrosDeLaBase>;
}) {
  const esHuesped = v.tipoSeleccionado === "huesped-temporal";
  return (
    <View className="rounded-2xl p-4 gap-3" style={{ boxShadow: theme.shadows.card }}>
      <Text className="text-base font-semibold text-center text-gray-900">
        Cantidad de invitados
      </Text>

      {v.esGuardiaOAdmin ? (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Select
              label={v.torreYDeptoOpcionales ? "Torre (opcional)" : "Torre *"}
              value={v.torre || null}
              options={["Todas", ...v.torresReales]}
              onChange={(x) => v.setTorre(x === "Todas" ? "" : String(x))}
            />
          </View>
          <View className="flex-1">
            <Select
              label={v.torreYDeptoOpcionales ? "Depto (opcional)" : "Depto *"}
              value={v.depto || null}
              options={["Todos", ...v.codigosDe(v.torre)]}
              onChange={(x) => v.setDepto(x === "Todos" ? "" : String(x))}
            />
          </View>
        </View>
      ) : (
        /*
          Un residente registra para **su** vivienda y no puede cambiarla. Hasta
          el 09/10/2026 se enseñaba en dos cajas con forma de campo: parecen
          editables, se pulsan y no pasa nada. Un dato que no se toca se
          escribe, no se mete en un recuadro con forma de campo.
        */
        <View className="flex-row items-center gap-2">
          <Ionicons name="home" size={14} color={theme.colors.textSecondary} />
          <Text className="text-sm text-gray-500">Vivienda</Text>
          <Text className="text-sm font-semibold text-gray-900">
            {v.torre && v.depto ? `${v.torre} · ${v.depto}` : "—"}
          </Text>
        </View>
      )}

      {/*
        En una estancia el número es opcional (15/10/2026): sin él, el huésped
        dice en su preregistro quiénes vienen, y el tope es el aforo del
        alojamiento.
      */}
      {esHuesped && (
        <View className="gap-1 pt-1">
          <Checkbox
            checked={v.fijarCuantos}
            onChange={v.setFijarCuantos}
            label="Sé cuántas personas vienen"
          />
          {!v.fijarCuantos && (
            <Text className="text-xs text-gray-500 leading-5">
              El huésped dirá en su preregistro quiénes vienen —adultos, menores
              y vehículos—, hasta el aforo del alojamiento.
            </Text>
          )}
        </View>
      )}

      {v.tipoSeleccionado !== "permanente" && parametros.listo && (!esHuesped || v.fijarCuantos) && (
        <View className="gap-3 pt-1">
          <Contador
            emoji="👥"
            label="Personas"
            ayuda={esHuesped ? "Incluye al titular de la reserva." : "Incluye a la persona que anuncias."}
            valor={v.cuantasPersonas}
            minimo={1}
            /*
              En una estancia, la capacidad que fijó el anfitrión (hueco 28);
              la base también lo comprueba.
            */
            maximo={
              esHuesped && v.aforoDelAlojamiento
                ? v.aforoDelAlojamiento
                : parametros.numero("personas_vehiculos_tope")
            }
            onCambiar={(x) => v.setPersonas(String(x))}
          />
          <View style={{ height: 1, backgroundColor: theme.colors.borderLight }} />
          <Contador
            emoji="👶"
            label="Menores"
            ayuda="De las personas de arriba, cuántas son menores de edad."
            valor={v.cantidadMenores}
            /*
              El titular no puede ser menor, asi que el tope es uno menos que el
              total.
            */
            maximo={Math.max(0, v.cuantasPersonas - 1)}
            onCambiar={v.setCantidadMenores}
          />
        </View>
      )}
    </View>
  );
}
