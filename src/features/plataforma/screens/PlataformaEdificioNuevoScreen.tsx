import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import * as Clipboard from "expo-clipboard";
import { Button, Card, Input, Select } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
// La raíz del enlace sale de aquí y no de `process.env` otra vez: dos sitios
// calculando la misma dirección con criterios distintos ya mandó invitaciones
// al dominio de un desconocido una vez.
import { webDeVeciyo } from "@/shared/services/ajustesDeLaApp";
import { usePlataforma } from "../hooks/usePlataforma";
import { paisesParaAltaDeEdificio } from "../services/plataforma.repo";
import { useParametrosDeLaBase } from "@/shared/hooks";

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

export function PlataformaEdificioNuevoScreen() {
  const navegacion = useNavegacionPlataforma();
  const addToast = useUIStore((s) => s.addToast);
  const { crear, edificios } = usePlataforma();
  /*
    Cuánto dura el enlace lo decide la base (`invitacion_admin_dias_validez`):
    la pantalla lo dice con ese valor, no con uno escrito aquí que se quede
    atrás si la base cambia.
  */
  const parametros = useParametrosDeLaBase();
  /*
    Los países donde se puede dar de alta un edificio, con su moneda: de la
    tabla `pais` (`alta_de_edificio`). Solo los que tienen moneda, porque un
    edificio nace con la suya y el dinero es lo que menos se puede suponer.
  */
  const { data: paises = [] } = useQuery({
    queryKey: ["plataforma", "paises-de-alta"],
    queryFn: paisesParaAltaDeEdificio,
  });

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("CO");
  const [correoAdmin, setCorreoAdmin] = useState("");
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  /** El resultado, con el enlace que solo existe una vez. */
  const [listo, setListo] = useState<{
    enlace: string | null;
    correo: { enviado: boolean; motivo: string | null } | null;
  } | null>(null);

  const guardar = async () => {
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = "¿Cómo se llama el edificio?";
    /*
      Dos edificios con el mismo nombre en la misma ciudad casi siempre son el
      mismo, dado de alta otra vez porque el primero se quedó sin
      administración y no había otra forma de invitarla. Ya la hay, en el
      resumen.
    */
    const igual = (a?: string | null, b?: string | null) =>
      (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
    if (
      nombre.trim() &&
      edificios.some((e) => igual(e.nombre, nombre) && igual(e.ciudad, ciudad))
    ) {
      nuevos.nombre =
        "Ya hay un edificio con ese nombre en esa ciudad. Si le falta administración, invítala desde el resumen.";
    }
    if (!direccion.trim()) nuevos.direccion = "Hace falta la dirección";
    /*
      Si se da un correo, se pide el nombre: la invitación lo lleva y el correo
      que recibe esa persona empieza con él. Sin nombre llegaría «Hola,».
    */
    if (correoAdmin.trim() && !nombreAdmin.trim()) {
      nuevos.nombreAdmin = "¿A nombre de quién va la invitación?";
    }
    if (
      correoAdmin.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correoAdmin.trim())
    ) {
      nuevos.correoAdmin = "Ese correo no parece válido";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    try {
      const resultado = await crear.mutateAsync({
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        pais,
        ciudad: ciudad.trim() || undefined,
        moneda: paises.find((p) => p.codigo === pais)?.moneda || undefined,
        correoAdmin: correoAdmin.trim() || undefined,
        nombreAdmin: nombreAdmin.trim() || undefined,
      });

      setListo({
        enlace: resultado.token
          ? `${await webDeVeciyo()}/invitacion?token=${resultado.token}`
          : null,
        correo: resultado.correo,
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
      <DesplazableConTeclado
        className="flex-1 bg-gray-50"
        contentContainerClassName="p-4 gap-4"
      >
        <Card className="p-4">
          <Text className="text-base font-semibold text-gray-900">
            {nombre} ya existe
          </Text>
          {listo.enlace ? (
            <>
              {/* Desde el 24/10/2026 la invitación sale sola por correo. */}
              {listo.correo?.enviado ? (
                <Text className="mt-2 text-sm text-gray-900">
                  {`Le enviamos la invitación por correo a ${correoAdmin.trim()}.`}
                </Text>
              ) : listo.correo ? (
                <Text className="mt-2 text-sm text-danger">
                  {`No salió el correo: ${listo.correo.motivo}. Envíale tú el enlace.`}
                </Text>
              ) : null}
              <Text className="mt-2 text-sm text-gray-600">
                Este es el enlace para que {nombreAdmin} cree su cuenta y
                administre el edificio, por si el correo no le llega.
                {parametros.listo
                  ? ` Vence en ${parametros.numero("invitacion_admin_dias_validez")} días.`
                  : ""}
              </Text>
              <View className="mt-3 rounded-xl bg-gray-100 p-3">
                <Text className="text-xs text-gray-700" selectable>
                  {listo.enlace}
                </Text>
              </View>
              <Text className="mt-2 text-xs text-warning">
                No se vuelve a mostrar. Si se pierde, se emite otro desde el
                resumen.
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
              hazlo desde el resumen: junto al edificio sale «Invitar a su
              administración».
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
      </DesplazableConTeclado>
    );
  }

  return (
    <DesplazableConTeclado
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
          options={paises.map((p) => ({ label: p.nombre, value: p.codigo }))}
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
    </DesplazableConTeclado>
  );
}
