import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database.types";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copiá .env.example a .env.local y completá los valores.",
  );
}

/**
 * Almacenamiento de sesión sobre SecureStore.
 *
 * La sesión de Supabase (access token + refresh token) supera con holgura el
 * límite de 2048 bytes por valor que impone SecureStore en Android, así que se
 * parte en fragmentos. La clave base guarda cuántos fragmentos hay; cada
 * fragmento vive en `<clave>.<n>`.
 *
 * No se usa AsyncStorage: el refresh token permite emitir sesiones nuevas, y
 * en AsyncStorage queda en texto plano (regla 8 de AGENTS.md).
 */
const TAMANO_FRAGMENTO = 1800;

const almacenamientoSeguro = {
  async getItem(clave: string): Promise<string | null> {
    try {
      const cabecera = await SecureStore.getItemAsync(clave);
      if (cabecera === null) return null;

      const total = Number(cabecera);
      if (!Number.isInteger(total) || total < 1) return null;

      const fragmentos: string[] = [];
      for (let i = 0; i < total; i += 1) {
        const parte = await SecureStore.getItemAsync(`${clave}.${i}`);
        if (parte === null) return null; // fragmento perdido: la sesión no sirve
        fragmentos.push(parte);
      }
      return fragmentos.join("");
    } catch {
      return null;
    }
  },

  async setItem(clave: string, valor: string): Promise<void> {
    try {
      await this.removeItem(clave);

      const fragmentos: string[] = [];
      for (let i = 0; i < valor.length; i += TAMANO_FRAGMENTO) {
        fragmentos.push(valor.slice(i, i + TAMANO_FRAGMENTO));
      }

      for (let i = 0; i < fragmentos.length; i += 1) {
        await SecureStore.setItemAsync(`${clave}.${i}`, fragmentos[i]);
      }
      await SecureStore.setItemAsync(clave, String(fragmentos.length));
    } catch {
      // Si no se pudo persistir, la sesión vive solo en memoria.
    }
  },

  async removeItem(clave: string): Promise<void> {
    try {
      const cabecera = await SecureStore.getItemAsync(clave);
      if (cabecera !== null) {
        const total = Number(cabecera);
        if (Number.isInteger(total)) {
          for (let i = 0; i < total; i += 1) {
            await SecureStore.deleteItemAsync(`${clave}.${i}`);
          }
        }
      }
      await SecureStore.deleteItemAsync(clave);
    } catch {
      // nada que limpiar
    }
  },
};

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: almacenamientoSeguro,
    autoRefreshToken: true,
    persistSession: true,
    // En React Native no hay URL de la que leer el token del magic link.
    detectSessionInUrl: false,
  },
});

export type { Database };

/**
 * El refresco automático solo debe correr con la app en primer plano: en
 * segundo plano el temporizador no es fiable y genera reintentos fallidos.
 */
AppState.addEventListener("change", (estado) => {
  if (estado === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
