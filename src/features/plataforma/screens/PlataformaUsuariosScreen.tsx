import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Input } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { ROLES_PLATAFORMA, type AccionSobreCuenta, type CuentaEnElPanel } from "../services/plataforma.repo";
import { useUsuariosDeLaApp } from "../hooks/usePanelDeLaApp";

/**
 * Las cuentas de la app: buscar y actuar (23/10/2026).
 *
 * De cada cuenta se ve lo que hace falta para ayudar a alguien que no puede
 * entrar --nombre, correo, si confirmó, si está bloqueada, cuándo entró por
 * última vez-- y en qué edificios está con qué rol. Nada de su vida en ellos:
 * ni chats, ni visitas, ni pagos (límite del 02/10/2026).
 *
 * Cada acción pide un segundo toque para confirmar, como quitar un rol en
 * Equipo.
 */

const ACCIONES: Record<AccionSobreCuenta, { boton: string; confirmar: string; hecho: string }> = {
  enviar_contrasena: {
    boton: "Enviar correo para poner contraseña",
    confirmar: "Confirmar: enviar el correo",
    hecho: "Correo enviado",
  },
  confirmar_correo: {
    boton: "Marcar el correo como confirmado",
    confirmar: "Confirmar: dar el correo por confirmado",
    hecho: "Correo confirmado",
  },
  bloquear: {
    boton: "Bloquear la cuenta",
    confirmar: "Confirmar: no podrá entrar",
    hecho: "Cuenta bloqueada",
  },
  desbloquear: {
    boton: "Desbloquear la cuenta",
    confirmar: "Confirmar: podrá volver a entrar",
    hecho: "Cuenta desbloqueada",
  },
};

const ROL_EN_EDIFICIO: Record<string, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino líder",
  residente: "Residente",
  corresidente: "Corresidente",
  huesped_temporal: "Huésped",
  administrador: "Administración",
  coadministrador: "Coadministración",
  guardia: "Portería",
};

export function PlataformaUsuariosScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const { esDueno, usuarioId, buscar, actuar } = useUsuariosDeLaApp();
  const [texto, setTexto] = useState("");
  const [cuentas, setCuentas] = useState<CuentaEnElPanel[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  /** «usuario:acción» a punto de hacerse: el segundo toque la confirma. */
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);

  const lanzarBusqueda = async () => {
    if (texto.trim().length < 3) {
      addToast("Escribe al menos 3 letras del correo o del nombre", "error");
      return;
    }
    try {
      setCuentas(await buscar.mutateAsync(texto.trim()));
      setAbierta(null);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo buscar"), "error");
    }
  };

  const hacer = async (cuenta: CuentaEnElPanel, accion: AccionSobreCuenta) => {
    const llave = `${cuenta.usuarioId}:${accion}`;
    if (porConfirmar !== llave) {
      setPorConfirmar(llave);
      return;
    }
    setPorConfirmar(null);
    try {
      await actuar.mutateAsync({ usuarioId: cuenta.usuarioId, accion });
      addToast(`${ACCIONES[accion].hecho}: ${cuenta.nombre}`, "success");
      setCuentas(await buscar.mutateAsync(texto.trim()));
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo completar"), "error");
    }
  };

  const accionesDe = (c: CuentaEnElPanel): AccionSobreCuenta[] => {
    const lista: AccionSobreCuenta[] = ["enviar_contrasena"];
    if (!c.correoConfirmado) lista.push("confirmar_correo");
    if (c.usuarioId !== usuarioId) lista.push(c.bloqueada ? "desbloquear" : "bloquear");
    return lista;
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-4">
      <Card className="gap-3 p-4">
        <Text className="text-base font-semibold text-gray-900">Buscar una cuenta</Text>
        <Input
          label="Correo o nombre"
          value={texto}
          onChangeText={setTexto}
          placeholder="Al menos 3 letras"
        />
        <Button onPress={lanzarBusqueda} fullWidth loading={buscar.isPending}>
          Buscar
        </Button>
      </Card>

      {cuentas && cuentas.length === 0 ? (
        <Card className="p-4">
          <Text className="text-sm text-gray-500">No hay ninguna cuenta con ese correo o nombre.</Text>
        </Card>
      ) : null}

      {(cuentas ?? []).map((c) => (
        <Card key={c.usuarioId} className="gap-2 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">{c.nombre}</Text>
              <Text className="text-xs text-gray-500">{c.correo}</Text>
            </View>
            {c.bloqueada ? <Badge status="Cancelado">Bloqueada</Badge> : <Badge status="Activa">Activa</Badge>}
          </View>

          <Text className="text-xs text-gray-500">
            {`Alta ${c.creadaEn} · ${c.ultimoIngreso ? `último ingreso ${c.ultimoIngreso}` : "nunca ha entrado"}`}
          </Text>
          <Text className="text-xs text-gray-500">
            {c.correoConfirmado ? "Correo confirmado" : "Correo sin confirmar"}
            {c.rolPlataforma ? ` · ${ROLES_PLATAFORMA[c.rolPlataforma]}` : ""}
          </Text>
          {c.edificios.length > 0 ? (
            c.edificios.map((e) => (
              <Text key={`${e.edificio}-${e.rol}`} className="text-xs text-gray-700">
                {`${e.edificio} · ${ROL_EN_EDIFICIO[e.rol] ?? e.rol}`}
              </Text>
            ))
          ) : (
            <Text className="text-xs text-gray-400">No está en ningún edificio</Text>
          )}

          {esDueno ? (
            abierta === c.usuarioId ? (
              <View className="mt-2 gap-2">
                {accionesDe(c).map((accion) => {
                  const pendiente = porConfirmar === `${c.usuarioId}:${accion}`;
                  return (
                    <Button
                      key={accion}
                      size="sm"
                      variant={pendiente ? (accion === "bloquear" ? "danger" : "primary") : "secondary"}
                      onPress={() => hacer(c, accion)}
                      loading={actuar.isPending && pendiente}
                    >
                      {pendiente ? ACCIONES[accion].confirmar : ACCIONES[accion].boton}
                    </Button>
                  );
                })}
              </View>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  setAbierta(c.usuarioId);
                  setPorConfirmar(null);
                }}
                style={{ marginTop: 8, alignSelf: "flex-start" }}
              >
                Acciones
              </Button>
            )
          ) : null}
        </Card>
      ))}

      {!esDueno ? (
        <Text className="px-1 text-xs text-gray-500">
          Soporte puede buscar cuentas; actuar sobre ellas es solo del dueño de la plataforma.
        </Text>
      ) : null}
    </ScrollView>
  );
}
