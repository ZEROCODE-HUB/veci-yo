import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button, Card, Input, Select } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
// La raíz del enlace sale de aquí y no de `process.env` otra vez: dos sitios
// calculando la misma dirección con criterios distintos ya mandó invitaciones
// al dominio de un desconocido una vez.
import { BASE_ENLACE } from "@/shared/services/invitaciones";
import { usePlataforma } from "../hooks/usePlataforma";

/**
 * Dar de alta un edificio.
 *
 * No crea la cuenta de su administración: la **invita**. Una cuenta la hace su
 * dueño con su contraseña, y la plataforma no elige claves de otros.
 *
 * El enlace de la invitación se enseña aquí, una vez. En la base solo queda su
 * hash --igual que el resto de las invitaciones-- así que si se cierra esta
 * pantalla sin copiarlo, hay que emitir otro. Se dice en pantalla en vez de
 * dejar que se descubra.
 */

const PAISES = [
  { label: "Colombia", value: "CO" },
  { label: "Perú", value: "PE" },
];

/** La moneda por país, que es lo que ya se usa en el resto del producto. */
const MONEDA_POR_PAIS: Record<string, string> = { CO: "COP", PE: "PEN" };

export function PlataformaEdificioNuevoScreen() {
  const navegacion = useNavegacionPlataforma();
  const addToast = useUIStore((s) => s.addToast);
  const { crear } = usePlataforma();

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("CO");
  const [correoAdmin, setCorreoAdmin] = useState("");
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  /** El resultado, con el enlace que solo existe una vez. */
  const [listo, setListo] = useState<{ enlace: string | null } | null>(null);

  const guardar = async () => {
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = "¿Cómo se llama el edificio?";
    if (!direccion.trim()) nuevos.direccion = "Hace falta la dirección";
    /*
      Si se da un correo, se pide el nombre: la invitación lo lleva y el correo
      que recibe esa persona empieza con él. Sin nombre llegaría «Hola,».
    */
    if (correoAdmin.trim() && !nombreAdmin.trim()) {
      nuevos.nombreAdmin = "¿A nombre de quién va la invitación?";
    }
    if (correoAdmin.trim() && !correoAdmin.includes("@")) {
      nuevos.correoAdmin = "Ese correo no parece un correo";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    try {
      const resultado = await crear.mutateAsync({
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        pais,
        ciudad: ciudad.trim() || undefined,
        moneda: MONEDA_POR_PAIS[pais] ?? "COP",
        correoAdmin: correoAdmin.trim() || undefined,
        nombreAdmin: nombreAdmin.trim() || undefined,
      });

      setListo({
        enlace: resultado.token
          ? `${BASE_ENLACE}/invitacion?token=${resultado.token}`
          : null,
      });
    } catch (error) {
      addToast(
        mensajeDeError(error, "No se pudo dar de alta el edificio"),
        "error",
      );
    }
  };

  if (listo) {
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerClassName="p-4 gap-4"
      >
        <Card className="p-4">
          <Text className="text-base font-semibold text-gray-900">
            {nombre} ya existe
          </Text>
          {listo.enlace ? (
            <>
              <Text className="mt-2 text-sm text-gray-600">
                Este es el enlace para que {nombreAdmin} cree su cuenta y
                administre el edificio. Vence en 14 días.
              </Text>
              <View className="mt-3 rounded-xl bg-gray-100 p-3">
                <Text className="text-xs text-gray-700" selectable>
                  {listo.enlace}
                </Text>
              </View>
              <Text className="mt-2 text-xs text-warning">
                Cópialo ahora: no se vuelve a mostrar. Si se pierde, hay que
                emitir otro.
              </Text>
              <Button
                onPress={async () => {
                  await Clipboard.setStringAsync(listo.enlace ?? "");
                  addToast("Enlace copiado", "success");
                }}
                fullWidth
                style={{ marginTop: 12 }}
              >
                Copiar el enlace
              </Button>
            </>
          ) : (
            <Text className="mt-2 text-sm text-gray-600">
              Todavía no tiene administración. Cuando sepas a quién invitar,
              vuelve a entrar aquí.
            </Text>
          )}
          <Button
            variant="secondary"
            onPress={() => navegacion.goBack()}
            fullWidth
            style={{ marginTop: 8 }}
          >
            Volver al panel
          </Button>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <Card className="gap-4 p-4">
        <Text className="text-base font-semibold text-gray-900">
          El edificio
        </Text>
        <Input
          label="Nombre"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Las Barranqueras 246"
          error={errores.nombre}
        />
        <Input
          label="Dirección"
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Carrera 5 #26-10"
          error={errores.direccion}
        />
        <Input
          label="Ciudad (opcional)"
          value={ciudad}
          onChangeText={setCiudad}
          placeholder="Bogotá"
        />
        <Select
          label="País"
          value={pais}
          options={PAISES}
          onChange={(valor) => setPais(String(valor))}
        />
      </Card>

      <Card className="gap-4 p-4">
        <Text className="text-base font-semibold text-gray-900">
          Su administración
        </Text>
        <Text className="text-xs leading-5 text-gray-500">
          Se le manda una invitación para que cree su cuenta. A partir de ahí el
          edificio es suyo: las torres, las viviendas y la gente los da de alta
          ella, no la plataforma.
        </Text>
        <Input
          label="Correo (opcional)"
          value={correoAdmin}
          onChangeText={setCorreoAdmin}
          type="email"
          placeholder="administracion@eledificio.com"
          error={errores.correoAdmin}
        />
        <Input
          label="A nombre de"
          value={nombreAdmin}
          onChangeText={setNombreAdmin}
          placeholder="Nombre de quien va a administrar"
          error={errores.nombreAdmin}
        />
      </Card>

      <Button onPress={guardar} fullWidth loading={crear.isPending}>
        Dar de alta el edificio
      </Button>
    </ScrollView>
  );
}
