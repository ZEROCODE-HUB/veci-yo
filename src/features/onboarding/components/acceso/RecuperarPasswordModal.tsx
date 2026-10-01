import { View, Text } from "react-native";
import { Button, Input, Modal } from "@/shared/components";
import type { UseRecuperacionReturn } from "../../types/recuperacion";

interface RecuperarPasswordModalProps {
  estado: UseRecuperacionReturn;
}

export function RecuperarPasswordModal({
  estado,
}: RecuperarPasswordModalProps) {
  const {
    visible,
    correo,
    error,
    enviado,
    setCorreo,
    setError,
    enviar,
    cerrar,
  } = estado;

  return (
    <Modal visible={visible} onClose={cerrar} title="Recuperar contraseña">
      {enviado ? (
        <View className="items-center gap-3.5 py-2">
          <Text className="text-[44px]">📩</Text>
          <Text className="text-base text-gray-900 text-center leading-6">
            Si <Text className="font-bold">{correo.trim()}</Text> está
            registrado, te enviamos instrucciones para restablecer tu
            contraseña.
          </Text>
          <Button onPress={cerrar}>Aceptar</Button>
        </View>
      ) : (
        <View className="gap-3.5">
          <Text className="text-sm text-gray-500 leading-5">
            Ingresa el correo asociado a tu cuenta y te enviaremos instrucciones
            para recuperar el acceso.
          </Text>
          <Input
            label="Correo"
            value={correo}
            onChangeText={(value) => {
              setCorreo(value);
              if (error) setError("");
            }}
            placeholder="tu@correo.com"
            type="email"
            error={error}
            showEditIcon={false}
          />
          <Button onPress={enviar}>Enviar instrucciones</Button>
        </View>
      )}
    </Modal>
  );
}
