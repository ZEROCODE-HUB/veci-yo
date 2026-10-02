import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Badge, Button, Card, Input, Select } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import { useSoportePlataforma } from "../hooks/usePlataforma";
import type { PlataformaStackParamList } from "@/shared/types/navigation";

/**
 * Una PQRS sobre la aplicación, y su respuesta.
 *
 * El contacto que sale aquí es el que la propia persona escribió en el
 * formulario para que la llamaran. No se va a buscar su correo real a la cuenta:
 * pedir ayuda no es autorizar que se saque el resto de su ficha.
 */

const ESTADOS = [
  { label: "Sin atender", value: "pendiente" },
  { label: "En curso", value: "en_curso" },
  { label: "Resuelta", value: "resuelto" },
];

export function PlataformaSoporteDetalleScreen() {
  const route = useRoute<RouteProp<PlataformaStackParamList, "PlataformaSoporteDetalle">>();
  const navegacion = useNavegacionPlataforma();
  const addToast = useUIStore((s) => s.addToast);
  const { reclamos, responder } = useSoportePlataforma();

  const reclamo = reclamos.find((r) => r.id === route.params.id);

  /*
    Lo que ya hubiera escrito, para poder corregirlo en vez de empezar de cero.
    Se arranca con `?? ""` porque `resolucion` es nula mientras nadie contesta.
  */
  const [respuesta, setRespuesta] = useState(reclamo?.resolucion ?? "");
  const [estado, setEstado] = useState<string>(reclamo?.estado ?? "pendiente");
  const [error, setError] = useState("");

  if (!reclamo) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-sm text-gray-500">
          Esta PQRS ya no está en la lista. Vuelve atrás y entra de nuevo.
        </Text>
      </View>
    );
  }

  const guardar = async () => {
    /*
      Marcarla resuelta sin decir qué se hizo deja a quien la escribió con un
      «resuelto» y nada más. La base no lo exige --`resolucion` es nula-- así
      que se exige aquí, que es donde se sabe lo que significa.
    */
    if (estado === "resuelto" && !respuesta.trim()) {
      setError("Si la cierras, di qué se hizo: quien la escribió lo va a leer.");
      return;
    }
    setError("");

    try {
      await responder.mutateAsync({
        reclamoId: reclamo.id,
        resolucion: respuesta.trim(),
        estado: estado as typeof reclamo.estado,
      });
      addToast("Respuesta guardada", "success");
      navegacion.goBack();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar la respuesta"), "error");
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <Card className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-base font-semibold text-gray-900">
            {reclamo.titulo}
          </Text>
          <Badge
            status={
              reclamo.estado === "resuelto"
                ? "Resuelto"
                : reclamo.estado === "en_curso"
                  ? "En curso"
                  : "Pendiente"
            }
          />
        </View>
        <Text className="mt-1 text-xs text-gray-500">
          {reclamo.numero} · {reclamo.creadoEn}
        </Text>
        <Text className="mt-3 text-sm leading-6 text-gray-700">
          {reclamo.descripcion}
        </Text>
      </Card>

      <Card className="p-4">
        <Text className="text-sm font-semibold text-gray-900">Quién escribe</Text>
        <Text className="mt-2 text-sm text-gray-700">{reclamo.autor}</Text>
        <Text className="text-xs text-gray-500">{reclamo.condominio}</Text>

        {reclamo.correoContacto ? (
          <Text className="mt-2 text-xs text-gray-600" selectable>
            Correo: {reclamo.correoContacto}
          </Text>
        ) : null}
        {reclamo.telefonoContacto ? (
          <Text className="text-xs text-gray-600" selectable>
            Teléfono: {reclamo.telefonoContacto}
          </Text>
        ) : null}
        {reclamo.medioPreferido ? (
          <Text className="mt-1 text-xs text-gray-500">
            Prefiere que la contacten por: {reclamo.medioPreferido}
          </Text>
        ) : null}
        {/*
          El modelo del teléfono solo existe cuando la PQRS es sobre la app, y
          es justo lo que hace falta para reproducir el problema. Hay una
          restricción en la base que impide que aparezca en cualquier otra.
        */}
        {reclamo.modeloDispositivo ? (
          <Text className="mt-2 text-xs text-gray-600">
            Teléfono: {reclamo.modeloDispositivo}
          </Text>
        ) : null}
        {!reclamo.correoContacto && !reclamo.telefonoContacto ? (
          <Text className="mt-2 text-xs text-gray-400">
            No dejó forma de contacto.
          </Text>
        ) : null}
      </Card>

      <Card className="gap-4 p-4">
        <Text className="text-sm font-semibold text-gray-900">La respuesta</Text>
        <Input
          label="Qué se hizo"
          value={respuesta}
          onChangeText={setRespuesta}
          multiline
          rows={5}
          placeholder="Lo que va a leer quien la escribió"
          error={error}
        />
        <Select
          label="Estado"
          value={estado}
          options={ESTADOS}
          onChange={(valor) => setEstado(String(valor))}
        />
        <Button onPress={guardar} fullWidth loading={responder.isPending}>
          Guardar
        </Button>
      </Card>
    </ScrollView>
  );
}
