import React from "react";
import {
  Image,
  Linking,
  Modal as RNModal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";

interface Props {
  /** Las URL ya firmadas. `null` mientras no haya ninguna abierta. */
  urls: string[];
  /** Cuál se está mirando. `null` cierra el visor. */
  indice: number | null;
  onCerrar: () => void;
  onCambiar: (indice: number) => void;
}

/**
 * Una foto de documento, a pantalla completa.
 *
 * Las fotos se pintaban en miniaturas al 48% de ancho **y con `cover`**, que
 * recorta. En una cédula fotografiada apaisada eso se come los bordes, que es
 * justo donde está el número, y no había forma de abrirla: «no deja abrir la
 * imagen en tamaño completo», 09/10/2026.
 *
 * Es el caso de uso entero de esta pantalla. El anfitrión mira estas fotos
 * para una sola cosa —comprobar que el documento es de quien dice ser y que el
 * número coincide— y para eso hace falta verlo.
 *
 * `contain` y no `cover`: de un documento no sobra ningún borde.
 *
 * Y un botón para abrirlo en el navegador, porque ahí se puede **ampliar de
 * verdad** con los dedos o la rueda. Hacer el zoom aquí dentro pediría una
 * librería de gestos, y el navegador ya lo hace mejor; la URL va firmada y
 * caduca en una hora.
 */
export function VisorDeDocumento({ urls, indice, onCerrar, onCambiar }: Props) {
  const { width, height } = useWindowDimensions();
  const abierto = indice !== null && Boolean(urls[indice]);
  if (!abierto) return null;

  const url = urls[indice];
  const hayVarias = urls.length > 1;

  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <View className="flex-1" style={{ backgroundColor: theme.colors.bgVisorFoto }}>
        <View className="flex-row items-center justify-between px-4 pt-12 pb-2">
          <Text className="text-sm text-white">
            {hayVarias ? `${indice + 1} de ${urls.length}` : "Documento"}
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir en el navegador para ampliar"
              onPress={() => void Linking.openURL(url)}
              className="flex-row items-center gap-1.5 py-1"
            >
              <Ionicons name="expand" size={16} color="white" />
              <Text className="text-sm text-white">Ampliar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onCerrar}
              className="py-1 px-1"
            >
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>
        </View>

        {/*
          Tocar fuera cierra, que es lo que uno hace sin pensar. Lleva nombre
          porque sin el es un area pulsable que ocupa media pantalla y no dice
          que hace: quien no ve la imagen solo sabe que ahi se puede pulsar.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar la vista del documento"
          className="flex-1 items-center justify-center"
          onPress={onCerrar}
        >
          <Image
            source={{ uri: url }}
            /*
              El tamaño va en `style` y no en clases: react-native-web escribe
              el tamano real del archivo como estilo en linea sobre el
              contenedor, y un estilo en linea gana siempre a una clase. Ya
              costo una vez, con un PNG de 400px pintandose a 400px.
            */
            style={{ width: width - 24, height: height * 0.7 }}
            resizeMode="contain"
            accessibilityLabel={`Documento ${indice + 1}`}
          />
        </Pressable>

        {hayVarias ? (
          <View className="flex-row items-center justify-center gap-6 pb-10">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Anterior"
              accessibilityState={{ disabled: indice === 0 }}
              disabled={indice === 0}
              onPress={() => onCambiar(indice - 1)}
              style={{ opacity: indice === 0 ? 0.35 : 1 }}
              className="p-2"
            >
              <Ionicons name="chevron-back" size={28} color="white" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Siguiente"
              accessibilityState={{ disabled: indice === urls.length - 1 }}
              disabled={indice === urls.length - 1}
              onPress={() => onCambiar(indice + 1)}
              style={{ opacity: indice === urls.length - 1 ? 0.35 : 1 }}
              className="p-2"
            >
              <Ionicons name="chevron-forward" size={28} color="white" />
            </Pressable>
          </View>
        ) : (
          <View className="pb-10" />
        )}
      </View>
    </RNModal>
  );
}
