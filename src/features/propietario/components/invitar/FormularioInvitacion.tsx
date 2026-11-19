import { theme } from "@/config";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button, CampoFecha, Checkbox, Input, Select, Tabs } from "@/shared/components";
import type { Database } from "@/shared/types/database.types";
import {
  AYUDA_DEL_ROL,
  type FormularioInvitacion as Valores,
} from "../../hooks/useInvitarAUnidad";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];

interface Props {
  form: Valores;
  /** Los roles que esta persona puede dar de alta; los filtra el hook. */
  rolesInvitables: { value: RolUnidad; label: string }[];
  esHuesped: boolean;
  /** Un residente que no usará la app: sin correo (17/11/2026). */
  sinApp: boolean;
  /** Los tipos de documento del país del edificio. */
  documentosOfrecidos: { value: string; label: string }[];
  error: string | null;
  invitando: boolean;
  onChange: (valores: Valores) => void;
  onEnviar: () => void;
  /** El «Podrá / No podrá» del rol elegido, bajo el desplegable (17/11/2026). */
  resumenDelRol?: (rol: RolUnidad) => ReactNode;
}

export function FormularioInvitacion({
  form,
  rolesInvitables,
  esHuesped,
  sinApp,
  documentosOfrecidos,
  error,
  invitando,
  onChange,
  onEnviar,
  resumenDelRol,
}: Props) {
  const set = (cambios: Partial<Valores>) => onChange({ ...form, ...cambios });
  const ayuda = AYUDA_DEL_ROL[form.rol];

  return (
    <View className="gap-3">
      <Text className="text-base font-bold text-gray-900">
        Invitar a alguien
      </Text>

      <Input
        label="Nombre y apellido"
        soloLetras
        value={form.nombre}
        onChangeText={(nombre) => set({ nombre })}
        placeholder="Ej. Ana Restrepo"
      />

      <Select
        label="Rol en la vivienda"
        value={form.rol}
        options={rolesInvitables}
        // «Es menor de edad» solo existe para un residente: al cambiar de rol
        // no se queda marcado a escondidas (17/11/2026).
        onChange={(rol) => set({ rol: rol as Valores["rol"], esMenor: rol === "residente" ? form.esMenor : false })}
      />
      {ayuda ? (
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {ayuda}
        </Text>
      ) : null}
      {/* Qué podrá y qué no con ese rol (17/11/2026): lo pone la pantalla. */}
      {resumenDelRol ? resumenDelRol(form.rol) : null}
      {/*
        Al propietario, antes de invitar a un inquilino líder (18/11/2026,
        pedido del cliente): desde entonces el día a día es de quien vive ahí.
        La base lo sujeta (`ve_el_dia_a_dia`).
      */}
      {form.rol === "inquilino_lider" ? (
        <View
          className="rounded-xl p-3"
          style={{ backgroundColor: theme.colors.warningSoft }}
          accessibilityRole="alert"
        >
          <Text className="text-xs leading-4" style={{ color: theme.colors.badgeAmberText }}>
            Mientras haya inquilino líder, tú como propietario no verás la correspondencia, las visitas ni las
            reservas de zonas comunes de esta vivienda, ni te llegarán sus avisos. Sigues viendo anuncios, cuadro
            de honor, la gestión de la vivienda y los chats.
          </Text>
        </View>
      ) : null}

      {/*
        Un residente puede no usar la app --un niño, un abuelo-- (17/11/2026,
        plan aprobado por el cliente). Entonces no se le pide correo: se anota
        en la vivienda para que la portería sepa que vive ahí.
      */}
      {/*
        «Es menor de edad» va primero (17/11/2026): a un menor no se le crea
        cuenta, así que marcarlo quita la pregunta de la app y el correo. No
        se pide fecha de nacimiento: basta con la casilla (decisión del
        cliente).
      */}
      {form.rol === "residente" ? (
        <Checkbox
          checked={form.esMenor}
          onChange={(esMenor) => set({ esMenor, tipoDocumento: "" })}
          label="Es menor de edad"
        />
      ) : null}

      {form.rol === "residente" && !form.esMenor ? (
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-gray-900">¿Usará la app?</Text>
          <Tabs
            tabs={[
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
            ]}
            active={form.usaApp ? "si" : "no"}
            allowDeselect={false}
            onChange={(v) => set({ usaApp: v !== "no" })}
          />
        </View>
      ) : null}

      {sinApp ? (
        <View className="gap-3">
          <Select
            label="Tipo de documento (opcional)"
            value={form.tipoDocumento}
            options={documentosOfrecidos}
            onChange={(tipoDocumento) => set({ tipoDocumento: String(tipoDocumento) })}
          />
          <Input
            label="Número de documento (opcional)"
            value={form.documento}
            onChangeText={(documento) => set({ documento })}
          />
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            {form.esMenor
              ? "Un menor de edad no tiene cuenta en la app: se anota en la vivienda, sin correo ni invitación, para que la portería sepa que vive aquí."
              : "No recibe invitación ni tiene cuenta. Si más adelante quiere usar la app, puedes darle acceso desde su nombre en la lista."}
          </Text>
        </View>
      ) : (
        <Input
          label="Correo"
          type="email"
          value={form.correo}
          onChangeText={(correo) => set({ correo })}
          placeholder="ana@correo.com"
        />
      )}

      {/* Un huésped no puede existir sin fecha de salida: la restricción está
          en la base y aquí se pide antes de llegar a ella. */}
      {esHuesped && (
        <View className="gap-3">
          <CampoFecha
            label="Llega el"
            value={form.vigenteDesde}
            onChange={(vigenteDesde) => set({ vigenteDesde })}
            placeholder="Sin fecha de llegada"
          />
          <CampoFecha
            label="Se va el"
            value={form.vigenteHasta}
            onChange={(vigenteHasta) => set({ vigenteHasta })}
            placeholder="Elegir el último día"
          />
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Verá el alojamiento desde que acepte la invitación. El wifi y las
            instrucciones de entrada, solo a partir del día de llegada.
          </Text>
        </View>
      )}

      {/*
        Con el formulario vacío --al entrar, o recién enviado-- no se regaña:
        salía «Falta el nombre de la persona» en rojo antes de escribir nada
        (17/11/2026). El botón sigue apagado mientras falte algo.
      */}
      {error && (form.nombre.trim() || form.correo.trim()) ? (
        <Text className="text-xs" style={{ color: theme.colors.danger }}>
          {error}
        </Text>
      ) : null}

      <Button
        variant="primary"
        onPress={onEnviar}
        loading={invitando}
        disabled={Boolean(error) || invitando}
      >
        {sinApp ? "Agregar a la vivienda" : "Enviar invitación"}
      </Button>
    </View>
  );
}
