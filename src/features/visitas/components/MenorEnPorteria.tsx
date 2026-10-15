import React, { useContext, useState } from "react";
import { Linking, Text, View } from "react-native";
import { QueryClientContext } from "@tanstack/react-query";
import { Button, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { anotarRevisionMenor, type RevisionMenor } from "../services/porteria.repo";

interface Props {
  visible: boolean;
  onClose: () => void;
  invitadoUuid: string;
  nombre: string;
  /** Con quién entra: el adulto que responde por él. */
  adulto?: string;
  /** El teléfono de quien responde por la vivienda, si hay. */
  telefonoAnfitrion?: string;
}

/** El número de emergencias en Colombia. */
const POLICIA = "123";

/**
 * El menor en el registro físico de la portería (14/10/2026).
 *
 * Lo pidió la responsable de producto, con su texto. El guardia tiene el
 * documento del niño en la mano —no se le enseña ninguna foto— y elige una de
 * tres. Las dos que dudan avisan al anfitrión; la última no deja entrar hasta
 * que él lo revise. La regla está en la base (`menor_confirmado_para_entrar`).
 */
export function MenorEnPorteria({
  visible,
  onClose,
  invitadoUuid,
  nombre,
  adulto,
  telefonoAnfitrion,
}: Props) {
  const { addToast } = useUIStore();
  const cliente = useContext(QueryClientContext);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState<RevisionMenor | null>(null);

  const anotar = async (resultado: RevisionMenor) => {
    setEnviando(resultado);
    try {
      await anotarRevisionMenor(invitadoUuid, resultado, comentario);
      await cliente?.invalidateQueries({ queryKey: ["visitas"] });
      addToast(
        resultado === "se_parece"
          ? "Confirmado: ya puedes registrar su llegada"
          : resultado === "no_se_parece_seguro"
            ? "Anotado. Puede entrar; se avisó al anfitrión"
            : "Anotado. No entra hasta que el anfitrión lo revise",
        "success",
      );
      setComentario("");
      onClose();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo anotar"), "error");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Confirma al menor">
      <View className="gap-3">
        <Text className="text-sm font-semibold text-gray-900">
          {nombre}
          {adulto ? ` · entra con ${adulto}` : ""}
        </Text>
        <Text className="text-sm leading-5 text-gray-700">
          Es entendible que el rostro del niño no coincida del todo con su
          documento: los menores cambian de apariencia al crecer. Sin embargo,
          confirma que el niño se sienta cómodo junto al adulto con quien
          ingresa, y reporta a las autoridades si sospechas que puede estar en
          peligro.
        </Text>
        <Text className="text-sm font-semibold leading-5 text-gray-900">
          Protejamos a los menores: en tus manos puede estar su vida y su
          seguridad.
        </Text>
        <Input
          label="Comentarios (opcional)"
          value={comentario}
          onChangeText={setComentario}
          placeholder="Lo que viste"
          multiline
          showEditIcon={false}
        />
        <Button fullWidth loading={enviando === "se_parece"} onPress={() => anotar("se_parece")}>
          Sí se parece
        </Button>
        <Button
          fullWidth
          variant="secondary"
          loading={enviando === "no_se_parece_seguro"}
          onPress={() => anotar("no_se_parece_seguro")}
        >
          No se parece, pero parece estar seguro
        </Button>
        <Button
          fullWidth
          variant="danger"
          loading={enviando === "no_se_parece_revisar"}
          onPress={() => anotar("no_se_parece_revisar")}
        >
          No se parece: avisar al anfitrión
        </Button>
        <View className="flex-row gap-2.5">
          {telefonoAnfitrion ? (
            <View className="flex-1">
              <Button
                fullWidth
                variant="secondary"
                onPress={() => Linking.openURL(`tel:${telefonoAnfitrion}`)}
              >
                Llamar al anfitrión
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              fullWidth
              variant="secondary"
              onPress={() => Linking.openURL(`tel:${POLICIA}`)}
            >
              Llamar a la policía (123)
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
