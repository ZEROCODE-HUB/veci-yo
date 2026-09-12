import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "@/stores/auth-store";
import { getDemoRole } from "../data/demoRoles";
import { iniciarSesionRequest } from "../services";
import type { LoginFormData } from "../schemas";

export function useLogin() {
  const navigation = useNavigation<any>();
  const { iniciarSesion, ingresarIncognito, ingresarComoDemo, setRolActivo } =
    useAuthStore();
  const loginMutation = useMutation({
    mutationFn: iniciarSesionRequest,
    onSuccess: (data) => {
      iniciarSesion({ correo: data.correo });
      if (data.rol)
        setRolActivo(data.rol as Parameters<typeof setRolActivo>[0]);
    },
  });

  return {
    handleLogin: (data: LoginFormData) =>
      loginMutation.mutate({ correo: data.correo.trim() }),
    handleGoogle: () =>
      loginMutation.mutate({ correo: "usuario@gmail.com", rol: "propietario" }),
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
