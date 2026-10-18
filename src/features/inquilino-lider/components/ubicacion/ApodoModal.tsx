import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Button, Cargando, Input, Modal } from "@/shared/components";
import { useParametrosDeLaBase } from "@/shared/hooks";

interface ApodoModalProps {
  visible: boolean;
  /** Como se llama hoy la vivienda, para que el campo no salga vacio. */
  apodoActual: string;
  /** La vivienda, para que se vea a cual se le esta poniendo nombre. */
  vivienda: string;
  guardando: boolean;
  onClose: () => void;
  onGuardar: (apodo: string) => void;
}

/**
 * Ponerle nombre a tu vivienda: «La playa».
 *
 * Es lo que la tarjeta prometia desde el prototipo --decia «Alias:» sobre un
 * texto que compone la aplicacion-- y nunca existio. Ahora se guarda en la
 * membresia de esta persona, asi que es suyo: quien comparte la casa puede
 * llamarla de otra forma.
 *
 * El tope lo da la base (`apodo_largo_maximo`), porque donde se lee es una
 * linea que no se parte. Era un 40 escrito aqui, copia de la restriccion de la
 * tabla: si la base cambiaba, la pantalla no se enteraba.
 */
export function ApodoModal({
  visible,
  apodoActual,
  vivienda,
  guardando,
  onClose,
  onGuardar,
}: ApodoModalProps) {
  const [texto, setTexto] = useState(apodoActual);
  const parametros = useParametrosDeLaBase();

  // Al abrirlo otra vez tiene que traer lo que hay guardado, no lo que se
  // escribio y se descarto la vez anterior.
  useEffect(() => {
    if (visible) setTexto(apodoActual);
  }, [visible, apodoActual]);

  if (!parametros.listo) {
    return (
      <Modal visible={visible} onClose={onClose} title="Ponle nombre">
        <Cargando variante="enLinea" />
      </Modal>
    );
  }
  const tope = parametros.numero("apodo_largo_maximo");

  return (
    <Modal visible={visible} onClose={onClose} title="Ponle nombre">
      <View className="gap-3">
        <Text className="text-sm text-gray-500 leading-5">
          Así la verás tú en la barra de arriba y en esta lista, en vez de{" "}
          <Text className="font-medium text-gray-700">{vivienda}</Text>. Solo la
          ves tú: quien comparta la vivienda puede llamarla de otra forma.
        </Text>

        <Input
          label="Nombre"
          value={texto}
          onChangeText={(valor) => setTexto(valor.slice(0, tope))}
          placeholder="La playa"
        />

        <Button
          variant="primary"
          fullWidth
          onPress={() => onGuardar(texto)}
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </Button>

        {/*
          Quitarlo tiene que ser tan facil como ponerlo, y borrar el campo a
          mano y guardar no se le ocurre a nadie. Solo aparece si hay algo que
          quitar.
        */}
        {apodoActual !== "" && (
          <Button
            variant="secondary"
            fullWidth
            onPress={() => onGuardar("")}
            disabled={guardando}
          >
            Quitar el nombre
          </Button>
        )}
      </View>
    </Modal>
  );
}
