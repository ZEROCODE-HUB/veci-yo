import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Input, Modal } from "@/shared/components";

interface Props {
  /** El edificio al que se le invita la administración. `null`: cerrado. */
  edificio: { id: string; nombre: string } | null;
  enviando: boolean;
  onInvitar: (datos: { nombre: string; correo: string }) => void;
  onCerrar: () => void;
}

/**
 * A quién se invita a administrar un edificio que no tiene a nadie.
 *
 * Es la segunda oportunidad de lo que el alta pregunta una sola vez: si allí
 * no se dio un correo, o el enlace se perdió o caducó, hasta el 13/10/2026 no
 * había forma de arreglarlo desde el panel.
 */
export function InvitarAdministracion({
  edificio,
  enviando,
  onInvitar,
  onCerrar,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string }>(
    {},
  );

  // La ventana se queda montada: al cambiar de edificio se vacía.
  useEffect(() => {
    setNombre("");
    setCorreo("");
    setErrores({});
  }, [edificio?.id]);

  const enviar = () => {
    const nuevos: { nombre?: string; correo?: string } = {};
    if (!nombre.trim()) nuevos.nombre = "¿A nombre de quién va la invitación?";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim())) {
      nuevos.correo = correo.trim()
        ? "Ese correo no parece válido"
        : "Escribe el correo";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    onInvitar({ nombre: nombre.trim(), correo: correo.trim() });
  };

  return (
    <Modal
      visible={Boolean(edificio)}
      onClose={onCerrar}
      title="Invitar a la administración"
    >
      <View className="gap-3">
        <Text className="text-sm text-gray-500">
          {edificio?.nombre} no tiene a nadie en administración. Quien acepte
          esta invitación lo administra. Si había otra pendiente, deja de
          valer.
        </Text>
        <Input
          label="Nombre *"
          soloLetras
          placeholder="Nombre y apellido"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
        />
        <Input
          label="Correo *"
          placeholder="correo@ejemplo.com"
          type="email"
          value={correo}
          onChangeText={setCorreo}
          error={errores.correo}
        />
        <Button fullWidth loading={enviando} onPress={enviar}>
          <Text>Crear la invitación</Text>
        </Button>
        <Button variant="ghost" fullWidth onPress={onCerrar}>
          <Text>Cancelar</Text>
        </Button>
      </View>
    </Modal>
  );
}
