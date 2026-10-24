import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Cargando, SearchBar } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { CUENTAS_POR_PAGINA, ROLES_PLATAFORMA, type AccionSobreCuenta, type CuentaEnElPanel } from "../services/plataforma.repo";
import { useUsuariosDeLaApp } from "../hooks/usePanelDeLaApp";

/**
 * Las cuentas de la app: la lista por páginas, un buscador que la filtra, y
 * actuar sobre cada una (23 y 24/10/2026: «no quiero buscar sí o sí»).
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
  const [texto, setTexto] = useState("");
  /** Lo escrito, aplicado un momento después de dejar de teclear. */
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const { esDueno, usuarioId, cuentas, total, cargando, error, actuar } = useUsuariosDeLaApp(filtro, pagina);
  const [abierta, setAbierta] = useState<string | null>(null);
  /** «usuario:acción» a punto de hacerse: el segundo toque la confirma. */
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);

  useEffect(() => {
    const espera = setTimeout(() => {
      setFiltro(texto.trim());
      setPagina(1);
    }, 400);
    return () => clearTimeout(espera);
  }, [texto]);

  const paginas = Math.max(1, Math.ceil(total / CUENTAS_POR_PAGINA));

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
      <SearchBar value={texto} onChange={setTexto} placeholder="Filtrar por correo o nombre" />

      <Text className="px-1 text-xs text-gray-500">
        {total === 1 ? "1 cuenta" : `${total} cuentas`}
        {filtro ? ` con «${filtro}»` : ""}
      </Text>

      {cargando ? <Cargando texto="las cuentas" /> : null}

      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar las cuentas")}</Text>
        </Card>
      ) : null}

      {!cargando && !error && cuentas.length === 0 ? (
        <Card className="p-4">
          <Text className="text-sm text-gray-500">No hay ninguna cuenta con ese correo o nombre.</Text>
        </Card>
      ) : null}

      {cuentas.map((c) => (
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

      {paginas > 1 ? (
        <View className="flex-row items-center justify-between gap-3">
          <Button size="sm" variant="secondary" disabled={pagina <= 1} onPress={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <Text className="text-sm text-gray-700">{`Página ${pagina} de ${paginas}`}</Text>
          <Button size="sm" variant="secondary" disabled={pagina >= paginas} onPress={() => setPagina((p) => p + 1)}>
            Siguiente
          </Button>
        </View>
      ) : null}

      {!esDueno ? (
        <Text className="px-1 text-xs text-gray-500">
          Soporte puede ver las cuentas; actuar sobre ellas es solo del dueño de la plataforma.
        </Text>
      ) : null}
    </ScrollView>
  );
}
