import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Input, Select, Cargando } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { ROLES_PLATAFORMA } from "../services/plataforma.repo";
import { useStaffPlataforma } from "../hooks/usePlataforma";

/**
 * El equipo de la plataforma.
 *
 * Repartir este rol es lo más delicado que hay en el producto, así que el
 * camino está hecho en dos pasos a propósito: primero se **busca** la cuenta por
 * su correo y se ve de quién es, y solo después se le da el rol. Escribir un
 * correo y pulsar «dar permisos» en un paso es como se le dan permisos de dueño
 * a quien no era.
 *
 * Dos reglas que la base impone y aquí solo se explican:
 *
 *   · nadie se cambia su propio rol, ni para darse ni para quitarse nada;
 *   · no se puede quitar al último dueño, porque el camino de vuelta sería la
 *     clave de servicio del proyecto.
 */

const ROLES = [
  { label: "Soporte: atiende las PQRS de la app", value: "soporte" },
  { label: "Dueño: todo, y reparte este rol", value: "dueno" },
];

export function PlataformaEquipoScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const { staff, cargando, error, usuarioId, esDueno, buscar, dar, quitar } =
    useStaffPlataforma();

  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("soporte");
  const [encontrada, setEncontrada] = useState<{
    usuarioId: string;
    nombre: string;
    yaEsStaff: boolean;
  } | null>(null);

  const buscarCuenta = async () => {
    if (!correo.trim()) return;
    setEncontrada(null);
    try {
      const resultado = await buscar.mutateAsync(correo.trim());
      if (!resultado) {
        addToast(
          "No hay ninguna cuenta con ese correo. Que se registre primero.",
          "error",
        );
        return;
      }
      setEncontrada(resultado);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo buscar la cuenta"), "error");
    }
  };

  const darElRol = async () => {
    if (!encontrada) return;
    try {
      await dar.mutateAsync({ usuarioId: encontrada.usuarioId, rol: rol as "dueno" | "soporte" });
      addToast(`${encontrada.nombre} ya opera la plataforma`, "success");
      setEncontrada(null);
      setCorreo("");
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo dar el rol"), "error");
    }
  };

  if (cargando) {
    return (
      <Cargando texto="el equipo" />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">
            {mensajeDeError(error, "No se pudo cargar el equipo")}
          </Text>
        </Card>
      ) : null}

      <Card className="p-0">
        <Text className="p-4 text-base font-semibold text-gray-900">
          Quién opera Veciyo
        </Text>
        {staff.map((m) => (
          <View key={m.usuarioId} className="border-t border-gray-100 p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {m.nombre}
                </Text>
                <Text className="text-xs text-gray-500">
                  {ROLES_PLATAFORMA[m.rol]} · desde {m.creadoEn}
                </Text>
                {m.nota ? (
                  <Text className="mt-1 text-xs text-gray-400">{m.nota}</Text>
                ) : null}
              </View>
              {m.activo ? null : <Badge status="Cancelado">Retirado</Badge>}
            </View>

            {/*
              «Quitar» solo sobre otra persona, y solo si es el dueño quien
              mira. La base rechaza las dos cosas igual; esconder el botón es
              para no ofrecer lo que va a fallar.
            */}
            {esDueno && m.activo && m.usuarioId !== usuarioId ? (
              <Button
                variant="secondary"
                size="sm"
                onPress={async () => {
                  try {
                    await quitar.mutateAsync(m.usuarioId);
                    addToast(`${m.nombre} ya no opera la plataforma`, "success");
                  } catch (e) {
                    addToast(
                      mensajeDeError(e, "No se pudo quitar el rol"),
                      "error",
                    );
                  }
                }}
                style={{ marginTop: 12, alignSelf: "flex-start" }}
              >
                Quitarle el rol
              </Button>
            ) : null}

            {m.usuarioId === usuarioId ? (
              <Text className="mt-2 text-xs text-gray-400">
                Eres tú. Tu propio rol no te lo puedes cambiar: tiene que
                hacerlo otro dueño.
              </Text>
            ) : null}
          </View>
        ))}
      </Card>

      {esDueno ? (
        <Card className="gap-4 p-4">
          <Text className="text-base font-semibold text-gray-900">
            Añadir a alguien
          </Text>
          <Text className="text-xs leading-5 text-gray-500">
            Tiene que tener ya una cuenta en Veciyo. Primero se busca, para que
            veas de quién es antes de darle nada.
          </Text>

          <Input
            label="Correo de la cuenta"
            value={correo}
            onChangeText={(texto) => {
              setCorreo(texto);
              // Si se cambia el correo, lo encontrado antes deja de valer: sin
              // esto se podría dar el rol a una cuenta distinta de la que se ve.
              setEncontrada(null);
            }}
            type="email"
            placeholder="alguien@correo.com"
          />
          <Button
            variant="secondary"
            onPress={buscarCuenta}
            fullWidth
            loading={buscar.isPending}
          >
            Buscar la cuenta
          </Button>

          {encontrada ? (
            <View className="gap-4 rounded-xl bg-gray-100 p-4">
              <View>
                <Text className="text-sm font-semibold text-gray-900">
                  {encontrada.nombre}
                </Text>
                <Text className="text-xs text-gray-500">{correo}</Text>
                {encontrada.yaEsStaff ? (
                  <Text className="mt-1 text-xs text-warning">
                    Ya estaba en el equipo. Al guardar se le cambia el rol.
                  </Text>
                ) : null}
              </View>
              <Select
                label="Con qué alcance"
                value={rol}
                options={ROLES}
                onChange={(valor) => setRol(String(valor))}
              />
              <Button onPress={darElRol} fullWidth loading={dar.isPending}>
                Darle el rol
              </Button>
            </View>
          ) : null}
        </Card>
      ) : (
        <Card className="p-4">
          <Text className="text-xs leading-5 text-gray-500">
            Repartir este rol es solo del dueño de la plataforma.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}
