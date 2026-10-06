import { theme } from "@/config";
import { useEffect, useState } from "react";
import {ScrollView, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Button, Cargando } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import {
  aceptarInvitacion,
  consultarInvitacion,
  rechazarInvitacion,
  type DetalleInvitacion,
} from "@/shared/services/invitaciones";
import { useNavegacionEntrada } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils/error.util";

type RouteType = RouteProp<{ AceptarInvitacion: { token: string } }, "AceptarInvitacion">;

const ETIQUETA_ROL: Record<string, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino líder",
  residente: "Residente",
  corresidente: "Corresidente",
  coadministrador: "Coadministrador",
  administrador: "Administrador",
  guardia: "Seguridad",
};

export function AceptarInvitacionScreen() {
  const navigation = useNavegacionEntrada();
  const route = useRoute<RouteType>();
  const token = route.params?.token ?? "";

  const usuario = useAuthStore((s) => s.usuario);
  const autenticado = useAuthStore((s) => s.autenticado);
  const sincronizarContexto = useAuthStore((s) => s.sincronizarContexto);
  const addToast = useUIStore((s) => s.addToast);

  const [detalle, setDetalle] = useState<DetalleInvitacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const info = await consultarInvitacion(token);
        if (vigente) setDetalle(info);
      } catch {
        if (vigente) setDetalle(null);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [token]);

  if (cargando) {
    return (
      <ScreenLayout>
        <Cargando texto="la invitación" />
      </ScreenLayout>
    );
  }

  if (!detalle) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text className="text-lg font-bold text-gray-900">
            Invitación no encontrada
          </Text>
          <Text className="text-center text-sm text-gray-500">
            El enlace no es válido. Pedile a quien te invitó que te envíe uno nuevo.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  // La invitación se emite para una persona concreta, no para quien tenga el
  // enlace. Se avisa antes de intentar aceptar, para no mostrar un error seco.
  const correoCoincide =
    !autenticado ||
    usuario?.correo?.toLowerCase() === detalle.correo.toLowerCase();

  const aceptar = async () => {
    setProcesando(true);
    try {
      await aceptarInvitacion(token);
      await sincronizarContexto();
      addToast("¡Listo! Ya formás parte de tu edificio", "success");
      navigation.reset({ index: 0, routes: [{ name: "App" }] });
    } catch (error) {
      addToast(
        mensajeDeError(error, "No pudimos aceptar la invitación"),
        "error",
      );
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async () => {
    setProcesando(true);
    try {
      await rechazarInvitacion(token);
      addToast("Invitación rechazada", "info");
      navigation.goBack();
    } catch (error) {
      addToast(
        mensajeDeError(error, "No pudimos rechazar la invitación"),
        "error",
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="gap-1 pt-4">
          <Text className="text-2xl font-bold text-gray-900">
            Te invitaron a VeciYo
          </Text>
          <Text className="text-base text-gray-500">
            Hola {detalle.nombre}, revisá los datos antes de aceptar.
          </Text>
        </View>

        <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <Dato etiqueta="Edificio" valor={detalle.condominio} />
          {detalle.unidad && <Dato etiqueta="Unidad" valor={detalle.unidad} />}
          <Dato
            etiqueta="Rol"
            valor={ETIQUETA_ROL[detalle.rol] ?? detalle.rol}
          />
          <Dato etiqueta="Correo" valor={detalle.correo} />
        </View>

        {!detalle.vigente && (
          <Aviso
            tono="error"
            texto="Esta invitación ya venció o fue utilizada. Pedile a quien te invitó que te envíe una nueva."
          />
        )}

        {detalle.vigente && !autenticado && (
          <Aviso
            tono="info"
            texto={`Para aceptar necesitás iniciar sesión con ${detalle.correo}. Si todavía no tenés cuenta, registrate con ese mismo correo.`}
          />
        )}

        {detalle.vigente && autenticado && !correoCoincide && (
          <Aviso
            tono="error"
            texto={`Estás dentro con ${usuario?.correo}, pero esta invitación es para ${detalle.correo}. Cerrá sesión e ingresá con ese correo.`}
          />
        )}

        {detalle.vigente && autenticado && correoCoincide && (
          <View className="gap-2">
            <Button fullWidth loading={procesando} onPress={aceptar}>
              Aceptar invitación
            </Button>
            <Button
              fullWidth
              variant="secondary"
              disabled={procesando}
              onPress={rechazar}
            >
              Rechazar
            </Button>
          </View>
        )}

        {detalle.vigente && !autenticado && (
          <View className="gap-2">
            <Button fullWidth onPress={() => navigation.navigate("Login")}>
              Iniciar sesión
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onPress={() => navigation.navigate("Registro")}
            >
              Crear cuenta
            </Button>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-gray-500">{etiqueta}</Text>
      <Text className="text-sm font-semibold text-gray-900">{valor}</Text>
    </View>
  );
}

function Aviso({ tono, texto }: { tono: "info" | "error"; texto: string }) {
  const colores =
    tono === "error"
      ? { fondo: theme.colors.dangerLight, texto: theme.colors.badgeRedText }
      : { fondo: theme.colors.secondaryLight, texto: theme.colors.secondaryDark };
  return (
    <View className="rounded-xl p-3" style={{ backgroundColor: colores.fondo }}>
      <Text className="text-sm leading-5" style={{ color: colores.texto }}>
        {texto}
      </Text>
    </View>
  );
}
