import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import type { LoginFormData } from "../schemas";
import { mensajeDeError } from "@/shared/utils/error.util";
import { iniciarSesionConGoogle } from "@/shared/services/sesion";
import { iniciarSesionConGoogleNativo } from "../services/googleNativo";

/**
 * Traduce los errores de Supabase Auth a algo que el usuario entienda.
 *
 * Se llamaba `mensajeDeError`, igual que el ayudante compartido y haciendo otra
 * cosa. Y sacaba el texto con `String(error)`, que para un objeto da
 * «[object Object]»: ninguna de las tres frases casaba y todo acababa en «No
 * pudimos iniciar sesión». Con los errores de Auth no se notaba --esos sí son
 * `Error`-- pero el dia que llegue otra cosa, sí.
 */
function mensajeDeLogin(error: unknown): string {
  const bruto = mensajeDeError(error, "");
  if (/invalid login credentials/i.test(bruto)) {
    return "Correo o contraseña incorrectos";
  }
  if (/email not confirmed/i.test(bruto)) {
    return "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.";
  }
  if (/network|fetch/i.test(bruto)) {
    return "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.";
  }
  return "No pudimos iniciar sesión. Intentá de nuevo.";
}

export function useLogin() {
  const iniciarSesionReal = useAuthStore((s) => s.iniciarSesionReal);
  const addToast = useUIStore((s) => s.addToast);

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) =>
      iniciarSesionReal(data.correo, data.password),
    onError: (error) => addToast(mensajeDeLogin(error), "error"),
  });

  const googleMutation = useMutation({
    /*
      Dos caminos, y la decision vive **aqui** y no dentro de los servicios: en
      web se redirige la propia pagina, y en el telefono hay que abrir el
      navegador a mano y esperar a que vuelva a `veciyo://`.

      Se mira `globalThis.location` en vez de `Platform.OS` para no arrastrar
      `react-native` a un modulo que alcanzan las pruebas de recorrido --eso ya
      dejo un archivo entero sin arrancar--. Y la pregunta que importa es la
      misma: «¿hay una pagina a la que volver?».

      El camino del telefono **no esta recorrido**: no hay compilacion en un
      dispositivo todavia. Esta en REVISAR-A-OJO.
    */
    mutationFn: async (): Promise<void> => {
      if (globalThis.location?.origin) {
        await iniciarSesionConGoogle();
        return;
      }
      await iniciarSesionConGoogleNativo();
    },
    onError: (error) =>
      addToast(mensajeDeError(error, "No pudimos abrir el ingreso con Google"), "error"),
  });

  return {
    handleLogin: (data: LoginFormData) => loginMutation.mutate(data),
    ingresando: loginMutation.isPending,

    /*
      Entrar con Google. Conectado el 06/10/2026, cuando llegaron las
      credenciales del cliente.

      No hay `onSuccess`: cuando la promesa termina, la página ya está yendo a
      Google. De la vuelta se encarga el `onAuthStateChange` de
      `RootNavigator`, que escucha `SIGNED_IN` y sincroniza el contexto.

      El `onError` sí hace falta, y lleva el motivo de verdad --no un texto
      genérico--: en el teléfono esto falla a propósito, porque la aplicación no
      tiene declarado el esquema de enlace profundo y Google no sabría a dónde
      volver. Quien lo pulse ahí tiene que leer *por qué*, no «algo salió mal».
    */
    handleGoogle: () => googleMutation.mutate(),
    entrandoConGoogle: googleMutation.isPending,

  };
}
