import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { getDemoRole } from "../data/demoRoles";
import type { LoginFormData } from "../schemas";
import { useNavegacionEntrada } from "@/shared/hooks";

/** Traduce los errores de Supabase Auth a algo que el usuario entienda. */
function mensajeDeError(error: unknown): string {
  const bruto = error instanceof Error ? error.message : String(error);
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
  const navigation = useNavegacionEntrada();
  const iniciarSesionReal = useAuthStore((s) => s.iniciarSesionReal);
  const ingresarIncognito = useAuthStore((s) => s.ingresarIncognito);
  const ingresarComoDemo = useAuthStore((s) => s.ingresarComoDemo);
  const addToast = useUIStore((s) => s.addToast);

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) =>
      iniciarSesionReal(data.correo, data.password),
    onError: (error) => addToast(mensajeDeError(error), "error"),
  });

  return {
    handleLogin: (data: LoginFormData) => loginMutation.mutate(data),
    ingresando: loginMutation.isPending,

    // Google todavía no está configurado como proveedor en Supabase Auth.
    handleGoogle: () =>
      addToast("El ingreso con Google todavía no está disponible", "info"),

    handleIncognito: ingresarIncognito,
    handleDemoClick: (rolKey: string) => {
      const rolInfo = getDemoRole(rolKey);
      if (!rolInfo?.available) {
        navigation.navigate("DemoRole", { rol: rolKey });
        return;
      }
      ingresarComoDemo(rolInfo.key);
    },
  };
}
