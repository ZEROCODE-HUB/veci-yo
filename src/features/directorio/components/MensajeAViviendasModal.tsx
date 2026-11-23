import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal } from "@/shared/components";
import { mensajeDeError } from "@/shared/utils/error.util";
import { enviarMensajeAViviendas, type ResultadoDelMensaje } from "../services/directorio.repo";
import type { Unidad } from "../types/directorio";

/**
 * El texto del mensaje a las viviendas elegidas (16/11/2026). Llega por el
 * chat de cada una con la administración, con su aviso push. Al terminar dice
 * a cuántas llegó y, si alguna falló, cuál y por qué: no se da por enviado lo
 * que no salió.
 */
export function MensajeAViviendasModal({
  unidades,
  onClose,
  onEnviado,
}: {
  /** Las elegidas; vacío, la ventana está cerrada. */
  unidades: Unidad[];
  onClose: () => void;
  /** Cuando salió a todas: se cierra y se deja de seleccionar. */
  onEnviado: () => void;
}) {
  const [texto, setTexto] = useState("");
  // Pulsó «Enviar» sin mensaje: se dice debajo del campo.
  const [intento, setIntento] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDelMensaje[] | null>(null);
  const queryClient = useQueryClient();
  const enviar = useMutation({
    mutationFn: () =>
      enviarMensajeAViviendas(
        unidades.map((u) => u.uuid ?? ""),
        texto,
      ),
    onSuccess: (filas) => {
      setResultado(filas);
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const cerrar = () => {
    const todoSalio = resultado !== null && resultado.every((r) => r.enviado);
    setTexto("");
    setIntento(false);
    setResultado(null);
    enviar.reset();
    if (todoSalio) onEnviado();
    else onClose();
  };

  const enviados = (resultado ?? []).filter((r) => r.enviado);
  const fallidos = (resultado ?? []).filter((r) => !r.enviado);
  const nombreDe = (r: ResultadoDelMensaje) => {
    const unidad = unidades.find((u) => u.uuid === r.unidadId);
    return unidad ? `Torre ${unidad.torreNumero} · Depto ${unidad.codigo}` : `Depto ${r.codigo ?? "?"}`;
  };
  const cuantas = unidades.length === 1 ? "1 departamento" : `${unidades.length} departamentos`;

  return (
    <Modal visible={unidades.length > 0} onClose={cerrar} title="Enviar mensaje">
      {resultado ? (
        <View className="gap-3">
          <Text className="text-base font-semibold text-gray-900">
            {`Enviado a ${enviados.length} ${enviados.length === 1 ? "departamento" : "departamentos"}`}
          </Text>
          {fallidos.length ? (
            <View className="gap-1">
              <Text className="text-sm font-semibold text-gray-900">No se pudo enviar a:</Text>
              {fallidos.map((r) => (
                <Text key={r.unidadId} className="text-sm text-gray-700">
                  {`${nombreDe(r)}: ${r.motivo ?? "sin motivo"}`}
                </Text>
              ))}
            </View>
          ) : null}
          <Button fullWidth onPress={cerrar}>
            <Text>Listo</Text>
          </Button>
        </View>
      ) : (
        <View className="gap-3">
          <Text className="text-sm text-gray-500">
            {`Le llega a ${cuantas} por su chat con la administración, con un aviso en el celular.`}
          </Text>
          <Input
            label="Mensaje *"
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe el mensaje"
            multiline
            rows={4}
            error={intento && !texto.trim() ? "Escribe el mensaje" : undefined}
          />
          {enviar.isError ? (
            <Text className="text-sm text-gray-900">{mensajeDeError(enviar.error, "No se pudo enviar el mensaje")}</Text>
          ) : null}
          <Button
            fullWidth
            loading={enviar.isPending}
            onPress={() => {
              if (!texto.trim()) {
                setIntento(true);
                return;
              }
              enviar.mutate();
            }}
          >
            <Text>{`Enviar a ${cuantas}`}</Text>
          </Button>
          <Button variant="ghost" fullWidth onPress={cerrar}>
            <Text>Cancelar</Text>
          </Button>
        </View>
      )}
    </Modal>
  );
}
